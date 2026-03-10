import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, ShoppingBag, FileText, DollarSign, Search, ChevronRight, ArrowLeft, Star, Phone, Mail, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency, formatCurrencyDual } from '@/lib/currency';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

interface Client {
  id: string; name: string; email: string | null; phone: string | null; address: string | null; notes: string | null;
}
interface Product {
  id: string; name: string; name_es: string | null; description: string | null; category: string; unit_price: number; currency: string; unit: string | null; is_active: boolean;
}
interface Invoice {
  id: string; invoice_number: string; status: string; issue_date: string; due_date: string | null; total: number; currency: string;
  client?: Client;
}
interface Payment {
  id: string; amount: number; currency: string; payment_method: string; payment_date: string; reference: string | null;
  client?: Client; invoice?: { invoice_number: string };
}

const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-muted text-muted-foreground line-through',
};

export default function CRM() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const { isOwnerOrManager, profile } = useAuth();
  const navigate = useNavigate();
  const es = language === 'es';
  const [orgType, setOrgType] = useState<string>('');

  // Check org type - redirect residential owners away
  useEffect(() => {
    if (profile?.org_id) {
      supabase.from('organizations').select('org_type').eq('id', profile.org_id).single()
        .then(({ data }) => {
          const type = (data as any)?.org_type || 'residential';
          setOrgType(type);
          if (type === 'residential') {
            navigate('/', { replace: true });
          }
        });
    }
  }, [profile?.org_id]);

  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Dialog states
  const [showClientDialog, setShowClientDialog] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Form states
  const [clientForm, setClientForm] = useState({ name: '', email: '', phone: '', address: '', notes: '' });
  const [productForm, setProductForm] = useState({ name: '', name_es: '', description: '', category: 'service', unit_price: '', unit: 'unit' });
  const [invoiceForm, setInvoiceForm] = useState({ client_id: '', due_date: '', notes: '', items: [{ description: '', quantity: '1', unit_price: '' }] });
  const [paymentForm, setPaymentForm] = useState({ client_id: '', invoice_id: '', amount: '', payment_method: 'cash', reference: '', notes: '' });

  useEffect(() => {
    if (profile?.org_id) fetchAll();
  }, [profile?.org_id]);

  async function fetchAll() {
    if (!profile?.org_id) return;
    setLoading(true);
    try {
      const [cRes, pRes, iRes, payRes] = await Promise.all([
        supabase.from('clients').select('*').eq('org_id', profile.org_id).order('name'),
        supabase.from('product_catalog').select('*').eq('org_id', profile.org_id).order('name'),
        supabase.from('invoices').select('*, clients:client_id(id, name)').eq('org_id', profile.org_id).order('issue_date', { ascending: false }),
        supabase.from('client_payments').select('*, clients:client_id(id, name), invoices:invoice_id(invoice_number)').eq('org_id', profile.org_id).order('payment_date', { ascending: false }),
      ]);
      setClients((cRes.data || []) as Client[]);
      setProducts((pRes.data || []) as Product[]);
      setInvoices((iRes.data || []).map((i: any) => ({ ...i, client: i.clients })) as Invoice[]);
      setPayments((payRes.data || []).map((p: any) => ({ ...p, client: p.clients, invoice: p.invoices })) as Payment[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateClient() {
    if (!clientForm.name.trim() || !profile?.org_id) return;
    try {
      const { error } = await supabase.from('clients').insert({ org_id: profile.org_id, ...clientForm });
      if (error) throw error;
      toast.success(es ? 'Cliente creado' : 'Client created');
      setShowClientDialog(false);
      setClientForm({ name: '', email: '', phone: '', address: '', notes: '' });
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCreateProduct() {
    if (!productForm.name.trim() || !profile?.org_id) return;
    try {
      const { error } = await supabase.from('product_catalog').insert({
        org_id: profile.org_id, name: productForm.name, name_es: productForm.name_es || null,
        description: productForm.description || null, category: productForm.category,
        unit_price: Number(productForm.unit_price) || 0, unit: productForm.unit,
      });
      if (error) throw error;
      toast.success(es ? 'Producto creado' : 'Product created');
      setShowProductDialog(false);
      setProductForm({ name: '', name_es: '', description: '', category: 'service', unit_price: '', unit: 'unit' });
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCreateInvoice() {
    if (!invoiceForm.client_id || !profile?.org_id) return;
    try {
      const items = invoiceForm.items.filter(i => i.description.trim());
      const subtotal = items.reduce((acc, i) => acc + (Number(i.quantity) * Number(i.unit_price)), 0);
      const invNum = `INV-${Date.now().toString(36).toUpperCase()}`;

      const { data: inv, error } = await supabase.from('invoices').insert({
        org_id: profile.org_id, client_id: invoiceForm.client_id, invoice_number: invNum,
        due_date: invoiceForm.due_date || null, subtotal, total: subtotal, notes: invoiceForm.notes || null,
      }).select().single();
      if (error) throw error;

      if (items.length > 0 && inv) {
        await supabase.from('invoice_items').insert(
          items.map(i => ({
            invoice_id: inv.id, description: i.description,
            quantity: Number(i.quantity), unit_price: Number(i.unit_price),
            total: Number(i.quantity) * Number(i.unit_price),
          }))
        );
      }

      toast.success(es ? 'Factura creada' : 'Invoice created');
      setShowInvoiceDialog(false);
      setInvoiceForm({ client_id: '', due_date: '', notes: '', items: [{ description: '', quantity: '1', unit_price: '' }] });
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleCreatePayment() {
    if (!paymentForm.client_id || !paymentForm.amount || !profile?.org_id) return;
    try {
      const { error } = await supabase.from('client_payments').insert({
        org_id: profile.org_id, client_id: paymentForm.client_id,
        invoice_id: paymentForm.invoice_id || null,
        amount: Number(paymentForm.amount), payment_method: paymentForm.payment_method,
        reference: paymentForm.reference || null, notes: paymentForm.notes || null,
      });
      if (error) throw error;

      // If linked to invoice, mark as paid
      if (paymentForm.invoice_id) {
        await supabase.from('invoices').update({ status: 'paid' }).eq('id', paymentForm.invoice_id);
      }

      toast.success(es ? 'Pago registrado' : 'Payment recorded');
      setShowPaymentDialog(false);
      setPaymentForm({ client_id: '', invoice_id: '', amount: '', payment_method: 'cash', reference: '', notes: '' });
      fetchAll();
    } catch (e: any) { toast.error(e.message); }
  }

  // Revenue stats
  const totalRevenue = payments.reduce((a, p) => a + Number(p.amount), 0);
  const pendingInvoices = invoices.filter(i => ['sent', 'draft'].includes(i.status));
  const pendingTotal = pendingInvoices.reduce((a, i) => a + Number(i.total), 0);

  return (
    <ModernAppLayout>
      <div className="container py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold">
              {es ? 'Clientes y Ventas' : 'Clients & Sales'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {es ? 'Gestión de clientes, productos, facturas y pagos' : 'Manage clients, products, invoices & payments'}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: es ? 'Clientes' : 'Clients', value: clients.length, icon: Users, color: 'text-primary' },
            { label: es ? 'Productos' : 'Products', value: products.length, icon: ShoppingBag, color: 'text-purple-600' },
            { label: es ? 'Pendiente' : 'Pending', value: formatCurrency(pendingTotal, 'CRC'), icon: FileText, color: 'text-amber-600' },
            { label: es ? 'Ingresos' : 'Revenue', value: formatCurrency(totalRevenue, 'CRC'), icon: DollarSign, color: 'text-green-600' },
          ].map(s => (
            <Card key={s.label} className="estate-card">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-4">
            <TabsList>
              <TabsTrigger value="clients">{es ? 'Clientes' : 'Clients'}</TabsTrigger>
              <TabsTrigger value="products">{es ? 'Catálogo' : 'Catalog'}</TabsTrigger>
              <TabsTrigger value="invoices">{es ? 'Facturas' : 'Invoices'}</TabsTrigger>
              <TabsTrigger value="payments">{es ? 'Pagos' : 'Payments'}</TabsTrigger>
              <TabsTrigger value="portal">{es ? 'Portal Cliente' : 'Client Portal'}</TabsTrigger>
            </TabsList>
            {isOwnerOrManager && (
              <Button size="sm" onClick={() => {
                if (activeTab === 'clients') setShowClientDialog(true);
                else if (activeTab === 'products') setShowProductDialog(true);
                else if (activeTab === 'invoices') setShowInvoiceDialog(true);
                else setShowPaymentDialog(true);
              }}>
                <Plus className="h-4 w-4 mr-1" />
                {es ? 'Nuevo' : 'New'}
              </Button>
            )}
          </div>

          <TabsContent value="clients">
            {selectedClient ? (
              /* Client Detail View */
              <Card className="estate-card">
                <CardContent className="p-6 space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <Button variant="ghost" size="sm" className="mb-2 -ml-2" onClick={() => setSelectedClient(null)}>
                        <ArrowLeft className="h-4 w-4 mr-1" /> {es ? 'Volver' : 'Back'}
                      </Button>
                      <h2 className="text-2xl font-serif font-bold">{selectedClient.name}</h2>
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                        {selectedClient.email && <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{selectedClient.email}</span>}
                        {selectedClient.phone && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{selectedClient.phone}</span>}
                        {selectedClient.address && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{selectedClient.address}</span>}
                      </div>
                      {selectedClient.notes && <p className="text-sm text-muted-foreground mt-2 italic">{selectedClient.notes}</p>}
                    </div>
                  </div>

                  {/* Client invoices */}
                  <div>
                    <h3 className="font-semibold mb-3">{es ? 'Facturas' : 'Invoices'}</h3>
                    {invoices.filter(i => i.client?.id === selectedClient.id || (i as any).client_id === selectedClient.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{es ? 'Sin facturas' : 'No invoices'}</p>
                    ) : (
                      <div className="space-y-2">
                        {invoices.filter(i => i.client?.id === selectedClient.id || (i as any).client_id === selectedClient.id).map(inv => (
                          <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                            <div>
                              <span className="font-mono text-sm">{inv.invoice_number}</span>
                              <span className="text-sm text-muted-foreground ml-2">{format(new Date(inv.issue_date), 'MMM d, yyyy')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{formatCurrency(Number(inv.total), inv.currency)}</span>
                              <Badge className={INVOICE_STATUS_COLORS[inv.status] || ''}>{inv.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Client payments */}
                  <div>
                    <h3 className="font-semibold mb-3">{es ? 'Pagos recibidos' : 'Payments received'}</h3>
                    {payments.filter(p => p.client?.id === selectedClient.id || (p as any).client_id === selectedClient.id).length === 0 ? (
                      <p className="text-sm text-muted-foreground">{es ? 'Sin pagos' : 'No payments'}</p>
                    ) : (
                      <div className="space-y-2">
                        {payments.filter(p => p.client?.id === selectedClient.id || (p as any).client_id === selectedClient.id).map(pay => (
                          <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border">
                            <div>
                              <span className="font-medium text-green-600">{formatCurrency(Number(pay.amount), pay.currency)}</span>
                              <span className="text-sm text-muted-foreground ml-2">{format(new Date(pay.payment_date), 'MMM d, yyyy')}</span>
                            </div>
                            <Badge variant="outline">{pay.payment_method}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-primary/5 border border-primary/20">
                    <div>
                      <p className="text-xs text-muted-foreground">{es ? 'Total facturado' : 'Total invoiced'}</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(
                          invoices.filter(i => i.client?.id === selectedClient.id).reduce((a, i) => a + Number(i.total), 0),
                          'CRC'
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{es ? 'Total pagado' : 'Total paid'}</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(
                          payments.filter(p => p.client?.id === selectedClient.id).reduce((a, p) => a + Number(p.amount), 0),
                          'CRC'
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Client List */
              <Card className="estate-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{es ? 'Nombre' : 'Name'}</TableHead>
                      <TableHead>{es ? 'Email' : 'Email'}</TableHead>
                      <TableHead>{es ? 'Teléfono' : 'Phone'}</TableHead>
                      <TableHead>{es ? 'Dirección' : 'Address'}</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{es ? 'Sin clientes aún' : 'No clients yet'}</TableCell></TableRow>
                    ) : clients.map(c => (
                      <TableRow key={c.id} className="cursor-pointer hover:bg-primary/5" onClick={() => setSelectedClient(c)}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.email || '-'}</TableCell>
                        <TableCell>{c.phone || '-'}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{c.address || '-'}</TableCell>
                        <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <Card className="estate-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{es ? 'Producto' : 'Product'}</TableHead>
                    <TableHead>{es ? 'Categoría' : 'Category'}</TableHead>
                    <TableHead>{es ? 'Precio' : 'Price'}</TableHead>
                    <TableHead>{es ? 'Unidad' : 'Unit'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">{es ? 'Sin productos aún' : 'No products yet'}</TableCell></TableRow>
                  ) : products.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{es && p.name_es ? p.name_es : p.name}</TableCell>
                      <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                      <TableCell>{formatCurrency(Number(p.unit_price), p.currency)}</TableCell>
                      <TableCell>{p.unit}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card className="estate-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{es ? 'Cliente' : 'Client'}</TableHead>
                    <TableHead>{es ? 'Fecha' : 'Date'}</TableHead>
                    <TableHead>{es ? 'Total' : 'Total'}</TableHead>
                    <TableHead>{es ? 'Estado' : 'Status'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{es ? 'Sin facturas aún' : 'No invoices yet'}</TableCell></TableRow>
                  ) : invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.client?.name || '-'}</TableCell>
                      <TableCell>{format(new Date(inv.issue_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(inv.total), inv.currency)}</TableCell>
                      <TableCell><Badge className={INVOICE_STATUS_COLORS[inv.status] || ''}>{inv.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card className="estate-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{es ? 'Cliente' : 'Client'}</TableHead>
                    <TableHead>{es ? 'Monto' : 'Amount'}</TableHead>
                    <TableHead>{es ? 'Método' : 'Method'}</TableHead>
                    <TableHead>{es ? 'Fecha' : 'Date'}</TableHead>
                    <TableHead>{es ? 'Factura' : 'Invoice'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{es ? 'Sin pagos aún' : 'No payments yet'}</TableCell></TableRow>
                  ) : payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{p.client?.name || '-'}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(Number(p.amount), p.currency)}</TableCell>
                      <TableCell><Badge variant="outline">{p.payment_method}</Badge></TableCell>
                      <TableCell>{format(new Date(p.payment_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{p.invoice?.invoice_number || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Client Portal Tab */}
          <TabsContent value="portal">
            <ClientAccessManager />
          </TabsContent>
        </Tabs>

        {/* Client Dialog */}
        <Dialog open={showClientDialog} onOpenChange={setShowClientDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{es ? 'Nuevo Cliente' : 'New Client'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>{es ? 'Nombre' : 'Name'} *</Label><Input value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={clientForm.email} onChange={e => setClientForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{es ? 'Teléfono' : 'Phone'}</Label><Input value={clientForm.phone} onChange={e => setClientForm(f => ({ ...f, phone: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>{es ? 'Dirección' : 'Address'}</Label><Input value={clientForm.address} onChange={e => setClientForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div className="space-y-2"><Label>{es ? 'Notas' : 'Notes'}</Label><Textarea value={clientForm.notes} onChange={e => setClientForm(f => ({ ...f, notes: e.target.value }))} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowClientDialog(false)}>{es ? 'Cancelar' : 'Cancel'}</Button>
              <Button onClick={handleCreateClient}>{es ? 'Crear' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Product Dialog */}
        <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{es ? 'Nuevo Producto/Servicio' : 'New Product/Service'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{es ? 'Nombre (EN)' : 'Name (EN)'}</Label><Input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{es ? 'Nombre (ES)' : 'Name (ES)'}</Label><Input value={productForm.name_es} onChange={e => setProductForm(f => ({ ...f, name_es: e.target.value }))} /></div>
              </div>
              <div className="space-y-2"><Label>{es ? 'Descripción' : 'Description'}</Label><Textarea value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{es ? 'Categoría' : 'Category'}</Label>
                  <Select value={productForm.category} onValueChange={v => setProductForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service">{es ? 'Servicio' : 'Service'}</SelectItem>
                      <SelectItem value="plant">{es ? 'Planta' : 'Plant'}</SelectItem>
                      <SelectItem value="material">{es ? 'Material' : 'Material'}</SelectItem>
                      <SelectItem value="equipment">{es ? 'Equipo' : 'Equipment'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>{es ? 'Precio' : 'Price'}</Label><Input type="number" value={productForm.unit_price} onChange={e => setProductForm(f => ({ ...f, unit_price: e.target.value }))} /></div>
                <div className="space-y-2"><Label>{es ? 'Unidad' : 'Unit'}</Label><Input value={productForm.unit} onChange={e => setProductForm(f => ({ ...f, unit: e.target.value }))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowProductDialog(false)}>{es ? 'Cancelar' : 'Cancel'}</Button>
              <Button onClick={handleCreateProduct}>{es ? 'Crear' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Invoice Dialog */}
        <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>{es ? 'Nueva Factura' : 'New Invoice'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{es ? 'Cliente' : 'Client'} *</Label>
                  <Select value={invoiceForm.client_id} onValueChange={v => setInvoiceForm(f => ({ ...f, client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={es ? 'Seleccionar...' : 'Select...'} /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>{es ? 'Vencimiento' : 'Due date'}</Label><Input type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              </div>
              <div className="space-y-2">
                <Label>{es ? 'Líneas' : 'Line items'}</Label>
                {invoiceForm.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-6 gap-2">
                    <Input className="col-span-3" placeholder={es ? 'Descripción' : 'Description'} value={item.description} onChange={e => {
                      const items = [...invoiceForm.items]; items[idx] = { ...items[idx], description: e.target.value };
                      setInvoiceForm(f => ({ ...f, items }));
                    }} />
                    <Input placeholder={es ? 'Cant' : 'Qty'} type="number" value={item.quantity} onChange={e => {
                      const items = [...invoiceForm.items]; items[idx] = { ...items[idx], quantity: e.target.value };
                      setInvoiceForm(f => ({ ...f, items }));
                    }} />
                    <Input placeholder={es ? 'Precio' : 'Price'} type="number" value={item.unit_price} onChange={e => {
                      const items = [...invoiceForm.items]; items[idx] = { ...items[idx], unit_price: e.target.value };
                      setInvoiceForm(f => ({ ...f, items }));
                    }} />
                    <p className="flex items-center text-sm font-medium">{formatCurrency(Number(item.quantity) * Number(item.unit_price) || 0, 'CRC')}</p>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setInvoiceForm(f => ({ ...f, items: [...f.items, { description: '', quantity: '1', unit_price: '' }] }))}>
                  <Plus className="h-3 w-3 mr-1" /> {es ? 'Agregar línea' : 'Add line'}
                </Button>
              </div>
              <div className="text-right font-bold text-lg">
                Total: {formatCurrency(invoiceForm.items.reduce((a, i) => a + (Number(i.quantity) * Number(i.unit_price) || 0), 0), 'CRC')}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>{es ? 'Cancelar' : 'Cancel'}</Button>
              <Button onClick={handleCreateInvoice}>{es ? 'Crear' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>{es ? 'Registrar Pago' : 'Record Payment'}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{es ? 'Cliente' : 'Client'} *</Label>
                  <Select value={paymentForm.client_id} onValueChange={v => setPaymentForm(f => ({ ...f, client_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={es ? 'Seleccionar...' : 'Select...'} /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{es ? 'Factura (opcional)' : 'Invoice (optional)'}</Label>
                  <Select value={paymentForm.invoice_id} onValueChange={v => setPaymentForm(f => ({ ...f, invoice_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="-" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">-</SelectItem>
                      {invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').map(i => (
                        <SelectItem key={i.id} value={i.id}>{i.invoice_number} - {formatCurrency(Number(i.total), i.currency)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>{es ? 'Monto' : 'Amount'} *</Label><Input type="number" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>{es ? 'Método' : 'Method'}</Label>
                  <Select value={paymentForm.payment_method} onValueChange={v => setPaymentForm(f => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{es ? 'Efectivo' : 'Cash'}</SelectItem>
                      <SelectItem value="transfer">{es ? 'Transferencia' : 'Transfer'}</SelectItem>
                      <SelectItem value="card">{es ? 'Tarjeta' : 'Card'}</SelectItem>
                      <SelectItem value="check">{es ? 'Cheque' : 'Check'}</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>{es ? 'Referencia' : 'Reference'}</Label><Input value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>{es ? 'Cancelar' : 'Cancel'}</Button>
              <Button onClick={handleCreatePayment}>{es ? 'Registrar' : 'Record'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernAppLayout>
  );
}
