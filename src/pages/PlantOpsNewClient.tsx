import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Copy, Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useOrgType } from '@/hooks/usePlantOps';
import { reserveAsset, installAsset, upsertAssetDetails, BILLING_PERIODS, BILLING_PERIOD_LABELS } from '@/lib/plantops';
import {
  setCarePlan,
  fetchCareQueue,
  addChargeForEstate,
  createShareLink,
  approveManual,
  fetchShareLinks,
  CARE_RESPONSIBILITIES,
  POT_MATERIALS,
  POT_MATERIAL_LABELS,
  savePlantLine,
  CARE_RESPONSIBILITY_LABELS,
  type CareResponsibility,
} from '@/lib/plantopsCare';
import {
  fetchPropertyDetail,
  buildManualSnapshot,
  fetchServicePlan,
  saveServicePlan,
} from '@/lib/plantopsProperty';

/** Commercial services. Watering, pruning etc. are maintenance ACTIONS, not services. */
const SERVICE_KEYS = [
  'instalacion',
  'mantenimiento',
  'recordatorios',
  'manual',
  'alquiler',
  'reemplazos',
  'eventos',
  'otro',
] as const;

const SERVICE_LABELS: Record<string, { en: string; es: string }> = {
  instalacion: { en: 'Installation', es: 'Instalación' },
  mantenimiento: { en: 'Maintenance', es: 'Mantenimiento' },
  recordatorios: { en: 'Reminders', es: 'Recordatorios' },
  manual: { en: 'Custom manual', es: 'Manual personalizado' },
  alquiler: { en: 'Plant rental', es: 'Alquiler de plantas' },
  reemplazos: { en: 'Replacements', es: 'Reemplazos' },
  eventos: { en: 'Plants for events', es: 'Plantas para eventos' },
  otro: { en: 'Other', es: 'Otro' },
};


const LIGHT = ['sombra', 'luz_indirecta', 'luz_directa', 'artificial'];
const VENTILATION = ['baja', 'media', 'alta', 'aire_acondicionado'];
const WATER_METHODS = ['manual', 'regadera', 'goteo', 'inmersion', 'reservorio'];

interface PlantDraft {
  key: string;
  plantName: string;
  rentalPrice: string;
  floorLabel: string;
  zoneName: string;
  spotLabel: string;
  accessNotes: string;
  withPot: boolean;
  potMaterial: string;
  potDiameter: string;
  potHeight: string;
  potVolume: string;
  potDrainage: boolean;
  potHoles: string;
  potSaucer: boolean;
  potReservoir: boolean;
  potNotes: string;
  // care
  intervalDays: string;
  overrideDays: string;
  overrideReason: string;
  minIntervalDays: string;
  amountNote: string;
  waterMethod: string;
  lightRequired: string;
  lightActual: string;
  ventilation: string;
  responsibility: CareResponsibility;
  reminderContact: string;
  clientInstructions: string;
  doNotDo: string;
  placementId?: string;
  plantAssetId?: string | null;
  potAssetId?: string | null;
  zoneId?: string | null;
}

const emptyPlant = (): PlantDraft => ({
  key: crypto.randomUUID(),
  plantName: '',
  rentalPrice: '',
  floorLabel: '',
  zoneName: '',
  spotLabel: '',
  accessNotes: '',
  withPot: true,
  potMaterial: '',
  potDiameter: '',
  potHeight: '',
  potVolume: '',
  potDrainage: true,
  potHoles: '',
  potSaucer: false,
  potReservoir: false,
  potNotes: '',
  intervalDays: '',
  overrideDays: '',
  overrideReason: '',
  minIntervalDays: '',
  amountNote: '',
  waterMethod: '',
  lightRequired: '',
  lightActual: '',
  ventilation: '',
  responsibility: 'raiz_y_forma',
  reminderContact: '',
  clientInstructions: '',
  doNotDo: '',
});

/**
 * 6-step onboarding of a PlantOps client: client, services, plants, care, price, share.
 * Resumable: `/plantops/nuevo-cliente?estate=<uuid>` hydrates everything already saved
 * so re-entering never duplicates clients, assets, pots, placements, contracts or charges.
 */
export default function PlantOpsNewClient() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { language, tl } = useLanguage();
  const { orgId } = useOrgType();
  const { refetch: refetchEstates } = useEstate();
  const l = (en: string, es: string) => (language === 'es' ? es : en);

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [hydrating, setHydrating] = useState(false);

  // Step 1
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [estateId, setEstateId] = useState<string | null>(null);

  // Step 2
  const [services, setServices] = useState<Record<string, boolean>>({
    instalacion: true,
    mantenimiento: true,
    recordatorios: true,
    manual: true,
  });
  const [frequency, setFrequency] = useState('weekly');
  const [startsOn, setStartsOn] = useState(new Date().toISOString().slice(0, 10));
  const [contractId, setContractId] = useState<string | null>(null);

  // Step 3/4
  const [plants, setPlants] = useState<PlantDraft[]>([emptyPlant()]);

  // Step 5
  const [priceAmount, setPriceAmount] = useState('');
  const [currency, setCurrency] = useState('CRC');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [extras, setExtras] = useState<{ key: string; description: string; qty: string; price: string }[]>([]);

  // Step 6
  const [contactNote, setContactNote] = useState('');
  const [shareToggles, setShareToggles] = useState({
    showPlants: true, showManual: true, showLastVisit: true, showHistory: false, showBalance: false,
  });
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [existingLinkId, setExistingLinkId] = useState<string | null>(null);

  const hasRental = !!services.alquiler || !!services.eventos;

  useEffect(() => {
    document.title = l('New client | PlantOps', 'Nuevo cliente | PlantOps');
  }, [language]);

  /* ---------- resume: hydrate everything already persisted ---------- */

  const resumeEstateId = searchParams.get('estate');

  useEffect(() => {
    if (!resumeEstateId) return;
    let cancelled = false;
    (async () => {
      setHydrating(true);
      try {
        const [detail, plan, links] = await Promise.all([
          fetchPropertyDetail(resumeEstateId),
          fetchServicePlan(resumeEstateId),
          fetchShareLinks(resumeEstateId).catch(() => []),
        ]);
        if (cancelled) return;

        setEstateId(detail.estate.id);
        setPropertyName(detail.estate.name);
        setPropertyAddress(detail.estate.address_text || '');
        setClientId(detail.client?.id ?? null);
        setClientName(detail.client?.name ?? '');
        setClientEmail(detail.client?.email ?? '');
        setClientPhone(detail.client?.phone ?? '');

        if (plan.services) setServices(plan.services);
        if (plan.visit_frequency) setFrequency(plan.visit_frequency);
        if (plan.starts_on) setStartsOn(plan.starts_on);
        if (plan.currency) setCurrency(plan.currency);
        if (plan.billing_period) setBillingPeriod(plan.billing_period);
        if (plan.base_price != null) setPriceAmount(String(plan.base_price));
        // Resume exactly where the operator left off; a completed setup opens the last step.
        const rawStep = (plan as any).setup_step;
        if (rawStep === 'completed') setStep(6);
        else {
          const savedStep = Number(rawStep);
          if (Number.isFinite(savedStep) && savedStep >= 1 && savedStep <= 6) setStep(savedStep);
        }

        if (detail.contract) {
          setContractId(detail.contract.id);
          if (detail.contract.price_amount != null) setPriceAmount(String(detail.contract.price_amount));
          if (detail.contract.currency) setCurrency(detail.contract.currency);
          if (detail.contract.billing_period) setBillingPeriod(detail.contract.billing_period);
        }

        if (detail.placements.length) {
          setPlants(
            detail.placements.map((p) => ({
              ...emptyPlant(),
              key: p.id,
              placementId: p.id,
              plantAssetId: p.asset_id,
              potAssetId: p.pot_asset_id,
              zoneId: p.zone_id,
              plantName: p.asset_name,
              rentalPrice: p.rental_price != null ? String(p.rental_price) : '',
              floorLabel: p.floor_label || '',
              zoneName: p.zone_name || '',
              spotLabel: p.spot_label || '',
              accessNotes: p.access_notes || '',
              withPot: !!p.pot_asset_id,
              potMaterial: p.pot?.material || '',
              potDiameter: p.pot?.diameter_cm != null ? String(p.pot.diameter_cm) : '',
              potHeight: p.pot?.height_cm != null ? String(p.pot.height_cm) : '',
              potVolume: p.pot?.volume_liters != null ? String(p.pot.volume_liters) : '',
              potDrainage: p.pot?.has_drainage ?? true,
              potHoles: p.pot?.drainage_holes != null ? String(p.pot.drainage_holes) : '',
              potSaucer: p.pot?.has_saucer ?? false,
              potReservoir: p.pot?.reservoir ?? false,
              potNotes: p.pot?.notes || '',
              intervalDays: p.water_interval_days != null ? String(p.water_interval_days) : '',
              overrideDays: p.water_interval_override_days != null ? String(p.water_interval_override_days) : '',
              overrideReason: p.care_override_reason || '',
              minIntervalDays: p.min_interval_days != null ? String(p.min_interval_days) : '',
              amountNote: p.water_amount_note || '',
              waterMethod: p.water_method || '',
              lightRequired: p.light_required || '',
              lightActual: p.light_actual || '',
              ventilation: p.ventilation || '',
              responsibility: (p.care_responsibility as CareResponsibility) || 'raiz_y_forma',
              reminderContact: p.reminder_contact || '',
              clientInstructions: p.client_instructions || '',
              doNotDo: p.do_not_do || '',
            })),
          );
        }

        const activeLink = (links as any[]).find((x) => !x.revoked_at);
        if (activeLink) {
          setExistingLinkId(activeLink.id);
          setContactNote(activeLink.contact_note || '');
          setShareToggles({
            showPlants: activeLink.show_plants,
            showManual: activeLink.show_manual,
            showLastVisit: activeLink.show_last_visit,
            showHistory: activeLink.show_history,
            showBalance: activeLink.show_balance,
          });
        }
      } catch (e: any) {
        toast({ title: l('Could not load the setup', 'No se pudo cargar la configuración'), description: e.message, variant: 'destructive' });
      } finally {
        if (!cancelled) setHydrating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resumeEstateId]);

  const updatePlant = (key: string, patch: Partial<PlantDraft>) =>
    setPlants((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const stepTitles = useMemo(
    () => [
      l('Client & property', 'Cliente y propiedad'),
      l('Services', 'Servicios'),
      l('Plants, pots & location', 'Plantas, macetas y ubicación'),
      l('Care & reminders', 'Cuidados y recordatorios'),
      l('Price & extras', 'Precio y extras'),
      l('Share with client', 'Compartir con el cliente'),
    ],
    [language],
  );

  const persistServicePlan = async (eid: string, patch: Record<string, unknown>) => {
    const current = await fetchServicePlan(eid);
    await saveServicePlan(eid, { ...current, ...patch });
  };

  /**
   * Advances the wizard and persists the reached step so `?estate=` resumption
   * lands the operator exactly where they stopped.
   */
  const goStep = async (n: number, eid?: string | null) => {
    const target = eid ?? estateId;
    if (!target) {
      setStep(n);
      return;
    }
    // The step is persisted BEFORE advancing: if it cannot be saved the operator
    // stays where they are instead of losing the resume point.
    await persistServicePlan(target, { setup_step: n });
    setStep(n);
  };

  /* ---------- step actions ---------- */

  const saveStep1 = async () => {
    if (!orgId) return;
    if (!clientName.trim() || !propertyName.trim()) {
      toast({ title: l('Client and property name are required', 'Nombre de cliente y propiedad son obligatorios'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      let cid = clientId;
      if (!cid) {
        const { data, error } = await supabase
          .from('clients')
          .insert({ org_id: orgId, name: clientName.trim(), email: clientEmail.trim() || null, phone: clientPhone.trim() || null } as any)
          .select('id')
          .single();
        if (error) throw error;
        cid = (data as any).id;
        setClientId(cid);
      } else {
        await supabase.from('clients').update({ name: clientName.trim(), email: clientEmail.trim() || null, phone: clientPhone.trim() || null } as any).eq('id', cid);
      }

      let eid = estateId;
      if (!eid) {
        const { data, error } = await supabase
          .from('estates')
          .insert({
            org_id: orgId,
            client_id: cid,
            name: propertyName.trim(),
            address_text: propertyAddress.trim() || null,
            setup_status: 'setup',
          } as any)
          .select('id')
          .single();
        if (error) throw error;
        eid = (data as any).id;
        setEstateId(eid);
        await refetchEstates();
      } else {
        await supabase
          .from('estates')
          .update({ name: propertyName.trim(), address_text: propertyAddress.trim() || null, client_id: cid } as any)
          .eq('id', eid);
        await refetchEstates();
      }
      await goStep(2, eid);
    } catch (e: any) {
      toast({ title: l('Could not save', 'No se pudo guardar'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const saveStep2 = async () => {
    if (!orgId || !clientId || !estateId) return;
    setBusy(true);
    try {
      await persistServicePlan(estateId, {
        services,
        visit_frequency: frequency,
        starts_on: startsOn,
        currency,
      });

      // A rental contract exists ONLY when the client actually rents plants or books events.
      if (hasRental) {
        const contractType = services.alquiler ? 'recurring' : 'event';
        if (contractId) {
          const { error } = await supabase
            .from('rental_contracts')
            .update({ contract_type: contractType, services_json: services, maintenance_frequency: frequency, starts_on: startsOn } as any)
            .eq('id', contractId);
          if (error) throw error;
        } else {
          const { data, error } = await supabase
            .from('rental_contracts')
            .insert({
              org_id: orgId,
              client_id: clientId,
              estate_id: estateId,
              contract_type: contractType,
              status: 'draft',
              starts_on: startsOn,
              currency,
              services_json: services,
              maintenance_frequency: frequency,
            } as any)
            .select('id')
            .single();
          if (error) throw error;
          setContractId((data as any).id);
        }
      } else if (contractId) {
        // Rental was deselected: the contract is cancelled, never silently left active.
        const { error } = await supabase
          .from('rental_contracts')
          .update({ status: 'cancelled', services_json: services } as any)
          .eq('id', contractId);
        if (error) throw error;
        setContractId(null);
      }
      await goStep(3);
    } catch (e: any) {
      toast({ title: l('Could not save services', 'No se pudieron guardar los servicios'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const saveStep3 = async () => {
    if (!orgId || !estateId) return;
    const valid = plants.filter((p) => p.plantName.trim());
    if (!valid.length) {
      toast({ title: l('Add at least one plant', 'Agregue al menos una planta'), variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      for (const p of valid) {
        // One transaction per plant line for BOTH creation and edition: zone,
        // plant asset, pot asset, pot attributes, placement and installation.
        // Passing the known ids makes the call an update, never a duplicate.
        const line = await savePlantLine({
          estateId,
          plantName: p.plantName.trim(),
          placementId: p.placementId ?? null,
          plantAssetId: p.plantAssetId ?? null,
          potAssetId: p.potAssetId ?? null,
          zoneId: p.zoneId ?? null,
          zoneName: p.zoneName.trim() || null,
          floorLabel: p.floorLabel.trim() || null,
          spotLabel: p.spotLabel.trim() || null,
          accessNotes: p.accessNotes.trim() || null,
          contractId: hasRental ? contractId : null,
          withPot: p.withPot,
          potMaterial: p.withPot ? p.potMaterial || null : null,
          potDiameterCm: p.withPot && p.potDiameter ? Number(p.potDiameter) : null,
          potHeightCm: p.withPot && p.potHeight ? Number(p.potHeight) : null,
          potVolumeLiters: p.withPot && p.potVolume ? Number(p.potVolume) : null,
          potHasDrainage: p.withPot ? p.potDrainage : null,
          potDrainageHoles: p.withPot && p.potHoles ? Number(p.potHoles) : null,
          potHasSaucer: p.withPot ? p.potSaucer : null,
          potReservoir: p.withPot ? p.potReservoir : null,
          potNotes: p.withPot ? p.potNotes || null : null,
        });
        // Keep the ids in state immediately so a mid-flow failure on a later
        // plant can never re-create the ones already persisted.
        updatePlant(p.key, {
          placementId: line.placement_id,
          plantAssetId: line.plant_asset_id,
          potAssetId: line.pot_asset_id,
          zoneId: line.zone_id,
        });
        await upsertAssetDetails({
          assetId: line.plant_asset_id,
          lifecycleStatus: 'active',
          rentalPrice: hasRental && p.rentalPrice ? Number(p.rentalPrice) : null,
          currency,
        });
      }
      await goStep(4);
    } catch (e: any) {
      toast({ title: l('Could not register plants', 'No se pudieron registrar las plantas'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const saveStep4 = async () => {
    const installed = plants.filter((p) => p.placementId);
    if (installed.some((p) => !p.intervalDays)) {
      toast({ title: l('Every plant needs a base watering interval', 'Cada planta necesita un intervalo base de riego'), variant: 'destructive' });
      return;
    }
    const missingReason = installed.find((p) => p.overrideDays.trim() !== '' && !p.overrideReason.trim());
    if (missingReason) {
      toast({
        title: l('An override needs a reason', 'El override necesita un motivo'),
        description: missingReason.plantName,
        variant: 'destructive',
      });
      return;
    }
    setBusy(true);
    try {
      for (const p of installed) {
        await setCarePlan({
          placementId: p.placementId!,
          waterIntervalDays: Number(p.intervalDays),
          overrideDays: p.overrideDays.trim() !== '' ? Number(p.overrideDays) : null,
          overrideReason: p.overrideDays.trim() !== '' ? p.overrideReason.trim() : null,
          minIntervalDays: p.minIntervalDays ? Number(p.minIntervalDays) : null,
          waterAmountNote: p.amountNote || null,
          waterMethod: p.waterMethod || null,
          lightRequired: p.lightRequired || null,
          lightActual: p.lightActual || null,
          ventilation: p.ventilation || null,
          careResponsibility: p.responsibility,
          reminderContact: p.reminderContact || null,
          clientInstructions: p.clientInstructions || null,
          doNotDo: p.doNotDo || null,
        });
      }
      await goStep(5);
    } catch (e: any) {
      toast({ title: l('Could not save care plans', 'No se pudieron guardar los cuidados'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const saveStep5 = async () => {
    if (!estateId) return;
    setBusy(true);
    try {
      await persistServicePlan(estateId, {
        base_price: priceAmount ? Number(priceAmount) : null,
        currency,
        billing_period: billingPeriod,
      });

      if (hasRental && contractId) {
        const { error } = await supabase
          .from('rental_contracts')
          .update({
            price_amount: priceAmount ? Number(priceAmount) : null,
            currency,
            billing_period: billingPeriod,
            status: 'active',
          } as any)
          .eq('id', contractId);
        if (error) throw error;
      }
      for (const x of extras) {
        if (!x.description.trim() || !x.price) continue;
        await addChargeForEstate({
          estateId,
          description: x.description.trim(),
          quantity: Number(x.qty || 1),
          unitPrice: Number(x.price),
          currency,
        });
      }
      setExtras([]);
      await goStep(6);
    } catch (e: any) {
      toast({ title: l('Could not save pricing', 'No se pudo guardar el precio'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const finish = async () => {
    if (!estateId) return;
    setBusy(true);
    try {
      // Finishing twice must never rotate the client's link: an active link is reused.
      let linkId = existingLinkId;
      if (!linkId) {
        const link = await createShareLink({
          estateId,
          showPlants: shareToggles.showPlants,
          // The manual can only be shown when the manual service is contracted.
          showManual: shareToggles.showManual && !!services.manual,
          showLastVisit: shareToggles.showLastVisit,
          showHistory: shareToggles.showHistory,
          showBalance: shareToggles.showBalance,
          contactNote: contactNote || null,
        });
        linkId = link.id;
        setExistingLinkId(link.id);
        setShareUrl(link.url);
      }

      // Approving the manual is an explicit editorial act, and the snapshot must
      // carry the canonical effective days, never a recomputed guess.
      if (services.manual && shareToggles.showManual) {
        const [detail, queue] = await Promise.all([
          fetchPropertyDetail(estateId),
          fetchCareQueue(estateId),
        ]);
        const effectiveDays: Record<string, number | null> = {};
        for (const row of queue) effectiveDays[row.placement_id] = row.effective_days;
        await approveManual(linkId, buildManualSnapshot(detail, contactNote || null, effectiveDays));
      }

      await supabase.from('estates').update({ setup_status: 'active' } as any).eq('id', estateId);
      await persistServicePlan(estateId, { setup_step: 'completed' });
      await refetchEstates();
      toast({ title: l('Client is ready', 'Cliente listo') });
    } catch (e: any) {
      toast({ title: l('Could not finish the setup', 'No se pudo finalizar la configuración'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const next = () => {
    if (step === 1) return saveStep1();
    if (step === 2) return saveStep2();
    if (step === 3) return saveStep3();
    if (step === 4) return saveStep4();
    if (step === 5) return saveStep5();
    return finish();
  };

  /* ---------- render ---------- */

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 max-w-2xl mx-auto safe-area-content pb-28">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-primary" />
            {resumeEstateId ? l('Continue setup', 'Continuar configuración') : l('New client', 'Nuevo cliente')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {l('Step', 'Paso')} {step}/6 — {stepTitles[step - 1]}
          </p>
        </div>

        {hydrating && (
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {l('Loading saved setup…', 'Cargando configuración guardada…')}
          </p>
        )}

        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        {step === 1 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <Label>{l('Client name', 'Nombre del cliente')} *</Label>
                <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{l('Email', 'Correo')}</Label>
                  <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{l('Phone', 'Teléfono')}</Label>
                  <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>{l('Property name', 'Nombre de la propiedad')} *</Label>
                <Input value={propertyName} onChange={(e) => setPropertyName(e.target.value)} placeholder={l('e.g. Mall Oeste — Lobby', 'ej. Mall Oeste — Lobby')} />
              </div>
              <div className="space-y-1">
                <Label>{l('Address', 'Dirección')}</Label>
                <Input value={propertyAddress} onChange={(e) => setPropertyAddress(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                {SERVICE_KEYS.map((k) => (
                  <div key={k} className="flex items-center justify-between">
                    <Label className="text-sm">{l(SERVICE_LABELS[k].en, SERVICE_LABELS[k].es)}</Label>
                    <Switch checked={!!services[k]} onCheckedChange={(v) => setServices((prev) => ({ ...prev, [k]: v }))} />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {l(
                  'Watering, cleaning, pruning, fertilizing and rotation are maintenance actions logged on each visit, not commercial services.',
                  'Riego, limpieza, poda, fertilización y rotación son acciones de mantenimiento que se registran en cada visita, no servicios comerciales.',
                )}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{l('Visit frequency', 'Frecuencia de visitas')}</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['weekly', 'monthly', 'quarterly'].map((f) => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>{l('Starts on', 'Inicia el')}</Label>
                  <Input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
                </div>
              </div>
              {!hasRental && (
                <p className="text-xs text-muted-foreground">
                  {l(
                    'No rental selected: no rental contract will be created. The property keeps plants, care, manual and reminders.',
                    'Sin alquiler seleccionado: no se creará contrato de alquiler. La propiedad conserva plantas, cuidados, manual y recordatorios.',
                  )}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <div className="space-y-3">
            {plants.map((p, i) => (
              <Card key={p.key}>
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    {l('Plant', 'Planta')} {i + 1}
                    {p.placementId && <Badge variant="secondary" className="ml-2">{l('Saved', 'Guardada')}</Badge>}
                  </CardTitle>
                  {plants.length > 1 && !p.placementId && (
                    <Button variant="ghost" size="icon" onClick={() => setPlants((prev) => prev.filter((x) => x.key !== p.key))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2">
                      <Label>{l('Plant / species', 'Planta / especie')} *</Label>
                      <Input value={p.plantName} disabled={!!p.placementId} onChange={(e) => updatePlant(p.key, { plantName: e.target.value })} />
                    </div>
                    {hasRental && (
                      <div className="space-y-1">
                        <Label>{l('Monthly rental', 'Alquiler mensual')}</Label>
                        <Input type="number" value={p.rentalPrice} onChange={(e) => updatePlant(p.key, { rentalPrice: e.target.value })} />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label>{l('Floor', 'Piso')}</Label>
                      <Input value={p.floorLabel} onChange={(e) => updatePlant(p.key, { floorLabel: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>{l('Area / zone', 'Área / zona')}</Label>
                      <Input value={p.zoneName} onChange={(e) => updatePlant(p.key, { zoneName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>{l('Exact spot', 'Punto exacto')}</Label>
                      <Input value={p.spotLabel} onChange={(e) => updatePlant(p.key, { spotLabel: e.target.value })} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label>{l('Access notes', 'Notas de acceso')}</Label>
                      <Input value={p.accessNotes} onChange={(e) => updatePlant(p.key, { accessNotes: e.target.value })} />
                    </div>
                  </div>

                  <div className="pt-2 border-t space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{l('Pot', 'Maceta')}</p>
                      <div className="flex items-center gap-2">
                        <Label className="text-xs text-muted-foreground">{l('Plant has a pot', 'La planta tiene maceta')}</Label>
                        <Switch checked={p.withPot} onCheckedChange={(v) => updatePlant(p.key, { withPot: v })} />
                      </div>
                    </div>
                    {p.withPot && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>{l('Material', 'Material')}</Label>
                        <Select value={p.potMaterial} onValueChange={(v) => updatePlant(p.key, { potMaterial: v })}>
                          <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>
                            {POT_MATERIALS.map((m) => <SelectItem key={m} value={m}>{tl(POT_MATERIAL_LABELS[m])}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>{l('Diameter (cm)', 'Diámetro (cm)')}</Label>
                        <Input type="number" value={p.potDiameter} onChange={(e) => updatePlant(p.key, { potDiameter: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>{l('Height (cm)', 'Altura (cm)')}</Label>
                        <Input type="number" value={p.potHeight} onChange={(e) => updatePlant(p.key, { potHeight: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>{l('Volume (L)', 'Volumen (L)')}</Label>
                        <Input type="number" value={p.potVolume} onChange={(e) => updatePlant(p.key, { potVolume: e.target.value })} />
                      </div>
                      <div className="flex items-center justify-between col-span-2">
                        <Label className="text-sm">{l('Has drainage', 'Tiene drenaje')}</Label>
                        <Switch checked={p.potDrainage} onCheckedChange={(v) => updatePlant(p.key, { potDrainage: v })} />
                      </div>
                      {p.potDrainage && (
                        <div className="space-y-1 col-span-2">
                          <Label>{l('Drainage holes', 'Cantidad de huecos')}</Label>
                          <Input type="number" value={p.potHoles} onChange={(e) => updatePlant(p.key, { potHoles: e.target.value })} />
                        </div>
                      )}
                      <div className="flex items-center justify-between col-span-2">
                        <Label className="text-sm">{l('Has saucer', 'Tiene platón')}</Label>
                        <Switch checked={p.potSaucer} onCheckedChange={(v) => updatePlant(p.key, { potSaucer: v })} />
                      </div>
                      <div className="flex items-center justify-between col-span-2">
                        <Label className="text-sm">{l('Self-watering reservoir', 'Reservorio de autorriego')}</Label>
                        <Switch checked={p.potReservoir} onCheckedChange={(v) => updatePlant(p.key, { potReservoir: v })} />
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label>{l('Pot notes', 'Notas de maceta')}</Label>
                        <Input value={p.potNotes} onChange={(e) => updatePlant(p.key, { potNotes: e.target.value })} />
                      </div>
                    </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Button variant="outline" className="w-full" onClick={() => setPlants((prev) => [...prev, emptyPlant()])}>
              <Plus className="h-4 w-4 mr-2" />{l('Add another plant', 'Agregar otra planta')}
            </Button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            {plants.filter((p) => p.placementId).map((p) => (
              <Card key={p.key}>
                <CardHeader className="pb-2"><CardTitle className="text-base">{p.plantName}</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>{l('Base interval (days)', 'Intervalo base (días)')} *</Label>
                    <Input type="number" value={p.intervalDays} onChange={(e) => updatePlant(p.key, { intervalDays: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{l('Manual override (days)', 'Override manual (días)')}</Label>
                    <Input type="number" value={p.overrideDays} onChange={(e) => updatePlant(p.key, { overrideDays: e.target.value })} />
                  </div>
                  {p.overrideDays.trim() !== '' && (
                    <div className="space-y-1 col-span-2">
                      <Label>{l('Override reason', 'Motivo del override')} *</Label>
                      <Input
                        value={p.overrideReason}
                        onChange={(e) => updatePlant(p.key, { overrideReason: e.target.value })}
                        placeholder={l('e.g. large pot, low evaporation', 'ej. maceta grande y baja evaporación')}
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label>{l('Minimum days', 'Días mínimos')}</Label>
                    <Input type="number" value={p.minIntervalDays} onChange={(e) => updatePlant(p.key, { minIntervalDays: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>{l('Water method', 'Método de riego')}</Label>
                    <Select value={p.waterMethod} onValueChange={(v) => updatePlant(p.key, { waterMethod: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{WATER_METHODS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label>{l('Water amount', 'Cantidad de agua')}</Label>
                    <Input value={p.amountNote} onChange={(e) => updatePlant(p.key, { amountNote: e.target.value })} placeholder={l('e.g. 500 ml', 'ej. 500 ml')} />
                  </div>
                  <div className="space-y-1">
                    <Label>{l('Light required', 'Luz requerida')}</Label>
                    <Select value={p.lightRequired} onValueChange={(v) => updatePlant(p.key, { lightRequired: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{LIGHT.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l('Actual light', 'Luz real')}</Label>
                    <Select value={p.lightActual} onValueChange={(v) => updatePlant(p.key, { lightActual: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{LIGHT.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l('Ventilation', 'Ventilación')}</Label>
                    <Select value={p.ventilation} onValueChange={(v) => updatePlant(p.key, { ventilation: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>{VENTILATION.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{l('Responsibility', 'Responsable')} *</Label>
                    <Select value={p.responsibility} onValueChange={(v) => updatePlant(p.key, { responsibility: v as CareResponsibility })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CARE_RESPONSIBILITIES.map((r) => (
                          <SelectItem key={r} value={r}>{CARE_RESPONSIBILITY_LABELS[r][language === 'de' ? 'de' : language === 'es' ? 'es' : 'en']}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label>{l('Internal reminder contact', 'Contacto interno de recordatorio')}</Label>
                    <Input value={p.reminderContact} onChange={(e) => updatePlant(p.key, { reminderContact: e.target.value })} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label>{l('Client instructions', 'Instrucciones para el cliente')}</Label>
                    <Textarea rows={2} value={p.clientInstructions} onChange={(e) => updatePlant(p.key, { clientInstructions: e.target.value })} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label>{l('Do not do', 'No hacer')}</Label>
                    <Textarea rows={2} value={p.doNotDo} onChange={(e) => updatePlant(p.key, { doNotDo: e.target.value })} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {step === 5 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{hasRental ? l('Contract price', 'Precio del contrato') : l('Service price', 'Precio del servicio')}</Label>
                  <Input type="number" value={priceAmount} onChange={(e) => setPriceAmount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>{l('Currency', 'Moneda')}</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CRC">CRC</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>{l('Billing period', 'Periodo de cobro')}</Label>
                  <Select value={billingPeriod} onValueChange={setBillingPeriod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BILLING_PERIODS.map((b) => (
                        <SelectItem key={b} value={b}>{BILLING_PERIOD_LABELS[b][language === 'es' ? 'es' : 'en']}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <p className="text-sm font-medium">{l('Extra charges', 'Cargos extra')}</p>
                {extras.map((x) => (
                  <div key={x.key} className="grid grid-cols-6 gap-2 items-end">
                    <Input className="col-span-3" placeholder={l('Description', 'Descripción')} value={x.description}
                      onChange={(e) => setExtras((prev) => prev.map((y) => y.key === x.key ? { ...y, description: e.target.value } : y))} />
                    <Input className="col-span-1" type="number" placeholder="1" value={x.qty}
                      onChange={(e) => setExtras((prev) => prev.map((y) => y.key === x.key ? { ...y, qty: e.target.value } : y))} />
                    <Input className="col-span-2" type="number" placeholder={l('Price', 'Precio')} value={x.price}
                      onChange={(e) => setExtras((prev) => prev.map((y) => y.key === x.key ? { ...y, price: e.target.value } : y))} />
                  </div>
                ))}
                <Button variant="outline" size="sm"
                  onClick={() => setExtras((prev) => [...prev, { key: crypto.randomUUID(), description: '', qty: '1', price: '' }])}>
                  <Plus className="h-4 w-4 mr-2" />{l('Add charge', 'Agregar cargo')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 6 && (
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-1">
                <Label>{l('Contact note shown to the client', 'Nota de contacto visible al cliente')}</Label>
                <Textarea rows={2} value={contactNote} onChange={(e) => setContactNote(e.target.value)} />
              </div>
              {([
                ['showPlants', l('Plants', 'Plantas')],
                ['showManual', l('Manual', 'Manual')],
                ['showLastVisit', l('Last visit', 'Última visita')],
                ['showHistory', l('History', 'Historial')],
                ['showBalance', l('Balance', 'Saldo')],
              ] as const).map(([k, label]) => (
                <div key={k} className="flex items-center justify-between">
                  <Label className="text-sm">{label}</Label>
                  <Switch checked={(shareToggles as any)[k]} onCheckedChange={(v) => setShareToggles((prev) => ({ ...prev, [k]: v }))} />
                </div>
              ))}

              {existingLinkId && !shareUrl && (
                <p className="text-xs text-muted-foreground">
                  {l(
                    'This property already has an active client link. Finishing here approves the manual again and issues a new link; manage or revoke links from the property screen.',
                    'Esta propiedad ya tiene un enlace activo. Al finalizar se aprueba el manual otra vez y se emite un enlace nuevo; gestione o revoque enlaces desde la pantalla de la propiedad.',
                  )}
                </p>
              )}

              {shareUrl && (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-medium flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />{l('Client link ready', 'Enlace del cliente listo')}
                  </p>
                  <p className="text-xs break-all text-muted-foreground">{shareUrl}</p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(shareUrl); toast({ title: l('Copied', 'Copiado') }); }}>
                      <Copy className="h-4 w-4 mr-2" />{l('Copy', 'Copiar')}
                    </Button>
                    <Button size="sm" onClick={() => navigate(`/plantops/propiedad/${estateId}`)}>
                      {l('Open property', 'Abrir propiedad')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={busy}>
              <ChevronLeft className="h-4 w-4 mr-1" />{l('Back', 'Atrás')}
            </Button>
          )}
          {!shareUrl && (
            <Button className="flex-1" onClick={next} disabled={busy || hydrating}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {step === 6 ? l('Approve manual & create link', 'Aprobar manual y crear enlace') : l('Continue', 'Continuar')}
              {step < 6 && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          )}
        </div>
      </main>
    </ModernAppLayout>
  );
}
