export type LandingLanguage = 'en' | 'es' | 'de';

type LocalCopy = {
  seo: { title: string; description: string };
  nav: { how: string; audience: string; capabilities: string; pricing: string; signIn: string; create: string; menu: string };
  hero: { eyebrow: string; title: string; body: string; support: string; primary: string; secondary: string; imageAlt: string };
  problem: { eyebrow: string; title: string; body: string; rows: [string, string][] };
  how: { eyebrow: string; title: string; body: string; steps: [string, string][] };
  connected: { eyebrow: string; title: string; body: string; modelLabel: string; modelNote: string; model: string[]; routes: [string, string[]][] };
  audience: { eyebrow: string; title: string; body: string; groups: [string, string][] };
  visibility: { eyebrow: string; title: string; body: string; labels: string[]; values: string[]; demo: string };
  capabilities: { eyebrow: string; title: string; body: string; items: [string, string][] };
  differences: { eyebrow: string; title: string; body: string; items: [string, string][] };
  trust: { eyebrow: string; title: string; body: string; items: [string, string][] };
  pricing: Record<string, string | string[]>;
  faq: { eyebrow: string; title: string; items: [string, string][] };
  final: { title: string; body: string; create: string; signIn: string };
  footer: string;
};

export const landingCopy: Record<LandingLanguage, LocalCopy> = {
  "es": {
    "seo": {
      "title": "HomeGuide | Organiza el trabajo de cada propiedad",
      "description": "HomeGuide reúne las instrucciones de cada cliente, el trabajo pendiente y el historial de lo realizado para que su equipo siempre sepa qué hacer, qué pasó y qué sigue."
    },
    "nav": {
      "how": "Cómo funciona",
      "audience": "Para quién es",
      "capabilities": "Qué puede hacer",
      "pricing": "Precios",
      "signIn": "Ingresar",
      "create": "Crear cuenta",
      "menu": "Abrir navegación"
    },
    "hero": {
      "eyebrow": "PARA EQUIPOS QUE CUIDAN Y MANTIENEN PROPIEDADES",
      "title": "Que todos sepan qué hay que hacer en cada propiedad.",
      "body": "HomeGuide reúne las instrucciones de cada cliente, el trabajo pendiente y el historial de lo que ya se hizo. Su equipo abre la propiedad, ve qué toca hacer, registra el resultado y sigue.",
      "support": "Para paisajismo, mantenimiento, administración de propiedades, plantas y otros servicios recurrentes.",
      "primary": "Crear cuenta",
      "secondary": "Ver cómo funciona",
      "imageAlt": "Una propiedad con jardines y áreas que necesitan cuidado y mantenimiento"
    },
    "problem": {
      "eyebrow": "EL PROBLEMA",
      "title": "El problema no es hacer el trabajo. Es mantener el hilo.",
      "body": "Cada cliente tiene reglas, prioridades y detalles distintos. Cuando esa información queda en chats, hojas de cálculo o en la memoria de una persona, el servicio se vuelve difícil de repetir bien.",
      "rows": [
        [
          "CADA CLIENTE ES DIFERENTE",
          "Frecuencias, zonas, preferencias, excepciones y tareas cambian de una propiedad a otra."
        ],
        [
          "EL PERSONAL CAMBIA",
          "Cuando rota una cuadrilla, un encargado o un proveedor, la persona nueva suele empezar preguntando qué había que hacer."
        ],
        [
          "DESPUÉS HAY QUE RECONSTRUIR LO QUE PASÓ",
          "Fotos, mensajes y notas quedan separados. El administrador o el cliente termina preguntando qué se hizo, cuándo y qué quedó pendiente."
        ]
      ]
    },
    "how": {
      "eyebrow": "CÓMO FUNCIONA",
      "title": "Cada propiedad mantiene sus instrucciones y su historia.",
      "body": "HomeGuide acompaña el trabajo desde lo que necesita el cliente hasta lo que realmente ocurrió.",
      "steps": [
        [
          "GUARDE CÓMO SE ATIENDE CADA PROPIEDAD",
          "Cliente, propiedad, zonas, plantas o activos, instrucciones, preferencias y detalles importantes."
        ],
        [
          "ORGANICE LO QUE HAY QUE HACER",
          "Visitas, tareas recurrentes, mantenimiento, responsables y próximas fechas."
        ],
        [
          "REGISTRE EL TRABAJO REALIZADO",
          "Fotos, notas, hora, responsable, condición encontrada y cualquier problema que requiera seguimiento."
        ],
        [
          "MANTENGA A TODOS AL DÍA",
          "El equipo, el administrador y, cuando corresponda, el cliente pueden ver qué se hizo, qué está pendiente y qué sigue."
        ]
      ]
    },
    "connected": {
      "eyebrow": "MEMORIA DE CADA PROPIEDAD",
      "title": "Cuando cambia la persona, la información no se va con ella.",
      "body": "Las instrucciones, trabajos, fotos y notas quedan ligados a la propiedad donde ocurrieron. La siguiente persona puede continuar desde donde terminó la anterior.",
      "modelLabel": "La historia de cada servicio",
      "modelNote": "Desde las instrucciones del cliente hasta las fotos y notas de la visita. Incluya la zona o el elemento cuando corresponda.",
      "model": [
        "Cliente",
        "Propiedad",
        "Zona / elemento",
        "Trabajo",
        "Responsable",
        "Registro"
      ],
      "routes": []
    },
    "audience": {
      "eyebrow": "PARA QUIÉN ES",
      "title": "Para equipos que vuelven una y otra vez a las mismas propiedades.",
      "body": "HomeGuide funciona mejor cuando cada cliente o propiedad tiene trabajo recurrente y detalles que no deberían depender de la memoria de una sola persona.",
      "groups": [
        [
          "Paisajismo y jardines",
          "Guarde cómo cuidar cada jardín, programe podas y visitas, y deje fotos y notas para la siguiente cuadrilla."
        ],
        [
          "Mantenimiento de propiedades",
          "Organice revisiones y reparaciones, asigne responsables y deje claro qué se resolvió y qué sigue pendiente."
        ],
        [
          "Administración de propiedades, villas y condominios",
          "Reúna las instrucciones de cada propiedad y revise el trabajo de encargados y proveedores, aunque cambie el personal."
        ],
        [
          "Plantas e interiorismo vegetal",
          "Sepa qué cuidados necesita cada planta, registre las visitas y conserve las notas sobre su condición y reemplazos."
        ],
        [
          "Mantenimiento de activos y equipos",
          "Guarde instrucciones de mantenimiento para bombas, riego y otros equipos, con tareas e historial de reparaciones."
        ]
      ]
    },
    "visibility": {
      "eyebrow": "EN UNA SOLA VISTA",
      "title": "Abra una propiedad y entienda qué está pasando.",
      "body": "Vea qué necesita el cliente, cuándo fue la última visita, qué se hizo, quién lo hizo, qué fotos quedaron y qué toca después.",
      "labels": [
        "Cliente",
        "Propiedad",
        "Instrucción del cliente",
        "Última visita",
        "Trabajo realizado",
        "Responsable",
        "Fotos",
        "Nota",
        "Próxima visita",
        "Pendiente"
      ],
      "values": [
        "Villa Mar",
        "Casa 12",
        "Mantener los setos bajos sin bloquear la entrada",
        "6 oct",
        "Poda de setos + revisión de riego",
        "Daniel",
        "4",
        "Sector norte necesita revisión de válvula",
        "Jueves",
        "Revisar válvula de riego"
      ],
      "demo": "Ejemplo de una visita · datos ficticios"
    },
    "capabilities": {
      "eyebrow": "LO QUE PUEDE HACER",
      "title": "Todo lo necesario para que el trabajo no dependa de la memoria.",
      "body": "Reúna lo que su equipo necesita antes de la visita y lo que debe quedar claro después.",
      "items": [
        [
          "Clientes y propiedades",
          "Guarde las instrucciones y detalles de cada cliente y propiedad para saber cómo atenderlos."
        ],
        [
          "Tareas y visitas",
          "Organice lo pendiente, asigne responsables y planifique las próximas visitas y fechas de mantenimiento."
        ],
        [
          "Equipos y responsables",
          "Sepa quién atiende cada trabajo y gestione turnos, horas y herramientas según las funciones que active."
        ],
        [
          "Fotos, notas e historial",
          "Deje constancia de lo que se hizo, lo que cambió y lo que todavía necesita atención."
        ],
        [
          "Plantas, activos y equipos",
          "Consulte qué cuidados o mantenimiento necesita cada elemento y revise su historial."
        ],
        [
          "Información para el cliente",
          "Comparta el trabajo realizado mediante portales, reportes y documentos, según las funciones y el acceso que habilite."
        ]
      ]
    },
    "differences": {
      "eyebrow": "POR QUÉ HOMEGUIDE",
      "title": "Menos memoria, menos preguntas, más continuidad.",
      "body": "Las instrucciones y el historial siguen disponibles aunque cambie la persona que atiende la propiedad.",
      "items": [
        [
          "La información se queda con la propiedad",
          "Las instrucciones, tareas, fotos y notas se consultan junto al lugar al que pertenecen, no en conversaciones separadas."
        ],
        [
          "La siguiente persona sabe por dónde continuar",
          "Puede revisar lo anterior y lo pendiente sin depender de que alguien le cuente toda la historia."
        ],
        [
          "El trabajo queda claro con fotos y notas",
          "Registre el resultado de la visita y los detalles que no se ven en una tarea marcada como terminada."
        ],
        [
          "El administrador ve lo que está pasando",
          "Revise responsables, trabajo realizado y pendientes de las propiedades que administra."
        ],
        [
          "El cliente puede entender lo que recibió",
          "Comparta la información del servicio que corresponda, sin obligar al cliente a preguntar a varias personas."
        ],
        [
          "El historial ayuda a evitar repetir errores",
          "Consulte problemas anteriores, cambios y notas importantes antes de hacer el siguiente trabajo."
        ]
      ]
    },
    "trust": {
      "eyebrow": "INFORMACIÓN PRIVADA",
      "title": "Cada persona ve lo que necesita para hacer su trabajo.",
      "body": "Organice el acceso del equipo y decida qué información comparte con el cliente.",
      "items": [
        [
          "Acceso según el trabajo",
          "Dueños, administradores y equipos tienen distintas herramientas y accesos según su función y asignación."
        ],
        [
          "Información que decide compartir",
          "El portal muestra al cliente las secciones que habilite. Las notas internas no se incluyen en el portal del cliente."
        ],
        [
          "Un historial útil",
          "Las visitas y los trabajos completados conservan fotos, notas, responsables y fechas para consultar lo que ocurrió."
        ]
      ]
    },
    "pricing": {
      "eyebrow": "PRECIOS",
      "title": "Elija cuántas propiedades atiende y qué necesita su equipo.",
      "body": "Cada propiedad es un lugar real que atiende: una casa, una villa, un condominio u otro sitio de un cliente. Las funciones opcionales se cobran por cuenta, no por propiedad.",
      "monthly": "Mensual",
      "annual": "Anual",
      "annualNote": "Pague 10 meses, use 12",
      "properties": "Propiedades",
      "perProperty": "por propiedad / mes",
      "extras": "Funciones opcionales",
      "extrasBody": "Nueve funciones opcionales con precio por cuenta. Elija solo las que necesita su equipo.",
      "groupOperation": "Operación",
      "groupOperationBody": "Organice el trabajo del equipo, sus horas y las próximas tareas.",
      "groupManagement": "Gestión",
      "groupManagementBody": "Gestione herramientas, información para clientes, documentos y cobros.",
      "groupAnalysis": "Análisis",
      "groupAnalysisBody": "Revise el terreno y sus pendientes con herramientas de topografía.",
      "groupSpecialized": "Especializado",
      "groupSpecializedBody": "Cuidados para las plantas que atiende. La venta, el alquiler o los reemplazos dependen de su configuración, no de un cobro aparte.",
      "accountMonth": "cuenta / mes",
      "summary": "Su estimado",
      "dueMonthly": "por mes",
      "dueAnnual": "facturado anualmente",
      "saving": "Ahorro",
      "continue": "Crear cuenta y continuar",
      "included": "Base de cada cuenta",
      "includedItems": [
        "Clientes, propiedades y activos",
        "Tareas, registros e informes",
        "Interfaz EN, ES y DE",
        "Visualización USD y CRC"
      ],
      "decrease": "Reducir propiedades",
      "increase": "Aumentar propiedades",
      "catalogTitle": "Más herramientas para el trabajo de su equipo",
      "catalogBody": "Consulte las herramientas disponibles y elija las que necesita para atender sus propiedades.",
      "catalogNote": "La disponibilidad depende de las funciones y la configuración que active.",
      "capabilityCore": "Clientes, propiedades y documentos",
      "capabilityField": "Visitas, tareas y equipo",
      "capabilityCare": "Cuidados y próximas fechas",
      "capabilityAdmin": "Información para clientes y administración",
      "addon_field_operations": "Visitas, responsables, fotos y notas del trabajo realizado.",
      "addon_labor": "Turnos, horas y tarifas del equipo, con rutinas de limpieza.",
      "addon_reminders": "Recordatorios para tareas, mantenimiento y próximas fechas.",
      "addon_inventory": "Herramientas y materiales que su equipo utiliza en el trabajo.",
      "addon_client_portal": "Comparta con cada cliente la información que habilite en su portal.",
      "addon_reports_manuals": "Reportes del trabajo y manuales para consultar y compartir.",
      "addon_topography": "Revise elevaciones y pendientes del terreno.",
      "addon_financials": "Organice gastos, facturación y registros de pagos.",
      "addon_plant_care": "Consulte cuidados, fechas y recomendaciones para cada planta."
    },
    "faq": {
      "eyebrow": "PREGUNTAS FRECUENTES",
      "title": "Preguntas antes de la próxima visita",
      "items": [
        [
          "¿HomeGuide es solo para paisajismo?",
          "No. También sirve para equipos de mantenimiento, administradores de propiedades, servicios de plantas y quienes mantienen equipos. El punto en común es atender las mismas propiedades de forma recurrente."
        ],
        [
          "¿Qué pasa si cambia la persona que atiende una propiedad?",
          "Las instrucciones, tareas, fotos y notas permanecen en la propiedad. La persona nueva, con el acceso correspondiente, puede revisar lo que se hizo y lo que sigue pendiente."
        ],
        [
          "¿Puedo guardar fotos y notas de cada visita?",
          "Sí. Puede registrar fotos y notas de las visitas y del trabajo completado para consultarlas después junto a la propiedad correspondiente."
        ],
        [
          "¿El cliente puede ver lo que se hizo?",
          "Sí, si habilita el portal del cliente y las secciones que desea compartir. La disponibilidad depende de las funciones activadas y de los accesos que configure."
        ],
        [
          "¿Puedo manejar varias propiedades y clientes?",
          "Sí. Puede organizar varios clientes y las propiedades que atiende para cada uno. El precio base se calcula por propiedad; las funciones opcionales se cobran por cuenta."
        ],
        [
          "¿Es solo para plantas?",
          "No. El cuidado de plantas es una función opcional. También puede organizar mantenimiento, tareas, visitas y trabajo en otras partes de la propiedad."
        ]
      ]
    },
    "final": {
      "title": "Que la próxima visita no empiece desde cero.",
      "body": "Organice cada propiedad, deje claro qué hay que hacer y conserve el historial de lo que su equipo ya hizo.",
      "create": "Crear cuenta",
      "signIn": "Ingresar"
    },
    "footer": "Qué necesita cada propiedad, qué se hizo y qué sigue."
  },
  "en": {
    "seo": {
      "title": "HomeGuide | Organize the work at every property",
      "description": "HomeGuide brings client instructions, pending work and service history together so your team always knows what to do, what happened and what comes next."
    },
    "nav": {
      "how": "How it works",
      "audience": "Who it's for",
      "capabilities": "What you can do",
      "pricing": "Pricing",
      "signIn": "Sign in",
      "create": "Create account",
      "menu": "Open navigation"
    },
    "hero": {
      "eyebrow": "FOR TEAMS THAT CARE FOR AND MAINTAIN PROPERTIES",
      "title": "Make sure everyone knows what to do at each property.",
      "body": "HomeGuide brings together each client’s instructions, pending work and a history of what has already been done. Your team opens the property, sees what needs doing, records the result and moves on.",
      "support": "For landscaping, maintenance, property management, plant care and other recurring services.",
      "primary": "Create account",
      "secondary": "See how it works",
      "imageAlt": "A property with gardens and areas that need regular care and maintenance"
    },
    "problem": {
      "eyebrow": "THE PROBLEM",
      "title": "Doing the work isn’t the problem. Keeping track is.",
      "body": "Every client has different rules, priorities and details. When that information lives in chats, spreadsheets or one person’s memory, delivering the same good service again becomes harder.",
      "rows": [
        [
          "EVERY CLIENT IS DIFFERENT",
          "Schedules, areas, preferences, exceptions and tasks vary from one property to the next."
        ],
        [
          "PEOPLE CHANGE",
          "When a crew, supervisor or contractor changes, the next person often has to start by asking what needs to be done."
        ],
        [
          "THEN YOU HAVE TO PIECE TOGETHER WHAT HAPPENED",
          "Photos, messages and notes end up in different places. The manager or client has to ask what was done, when and what is still pending."
        ]
      ]
    },
    "how": {
      "eyebrow": "HOW IT WORKS",
      "title": "Every property keeps its instructions and its history.",
      "body": "HomeGuide follows the work from what the client needs to what actually happened.",
      "steps": [
        [
          "SAVE HOW EACH PROPERTY SHOULD BE CARED FOR",
          "Client, property, areas, plants or equipment, instructions, preferences and important details."
        ],
        [
          "ORGANIZE WHAT NEEDS TO BE DONE",
          "Visits, recurring tasks, maintenance, assigned team members and upcoming dates."
        ],
        [
          "RECORD THE WORK YOU COMPLETED",
          "Photos, notes, time, who did the work, the condition found and any issue that needs follow-up."
        ],
        [
          "KEEP EVERYONE UP TO DATE",
          "The team, manager and, where appropriate, the client can see what was done, what is pending and what comes next."
        ]
      ]
    },
    "connected": {
      "eyebrow": "EVERY PROPERTY’S MEMORY",
      "title": "When the person changes, the information stays.",
      "body": "Instructions, work, photos and notes stay with the property where they belong. The next person can pick up where the previous person left off.",
      "modelLabel": "The story of each service",
      "modelNote": "From the client’s instructions to the visit’s photos and notes. Include the area or item where relevant.",
      "model": [
        "Client",
        "Property",
        "Area / item",
        "Work",
        "Team member",
        "Service record"
      ],
      "routes": []
    },
    "audience": {
      "eyebrow": "WHO IT’S FOR",
      "title": "For teams that return to the same properties, again and again.",
      "body": "HomeGuide works best when each client or property needs recurring work and has details that should not depend on one person’s memory.",
      "groups": [
        [
          "Landscaping and gardens",
          "Save how each garden should be cared for, plan pruning and visits, and leave photos and notes for the next crew."
        ],
        [
          "Property maintenance",
          "Organize inspections and repairs, assign the work and make clear what was resolved and what is still pending."
        ],
        [
          "Property managers, villas and condominiums",
          "Keep each property’s instructions together and review work by staff and contractors, even when people change."
        ],
        [
          "Plant care and interior landscaping",
          "Know what care each plant needs, record visits and keep notes about its condition and replacements."
        ],
        [
          "Asset and equipment maintenance",
          "Keep maintenance instructions for pumps, irrigation and other equipment alongside tasks and repair history."
        ]
      ]
    },
    "visibility": {
      "eyebrow": "AT A GLANCE",
      "title": "Open a property and see what’s happening.",
      "body": "See what the client needs, when the last visit took place, what was done, who did it, the photos left behind and what comes next.",
      "labels": [
        "Client",
        "Property",
        "Client instruction",
        "Last visit",
        "Work completed",
        "Team member",
        "Photos",
        "Note",
        "Next visit",
        "Pending"
      ],
      "values": [
        "Villa Mar",
        "House 12",
        "Keep hedges low without blocking the entrance",
        "6 Oct",
        "Hedge trimming + irrigation check",
        "Daniel",
        "4",
        "North area needs a valve inspection",
        "Thursday",
        "Check irrigation valve"
      ],
      "demo": "Example service visit · fictional data"
    },
    "capabilities": {
      "eyebrow": "WHAT YOU CAN DO",
      "title": "Everything you need so the work doesn’t rely on memory.",
      "body": "Keep together what your team needs before a visit and what should be clear afterwards.",
      "items": [
        [
          "Clients and properties",
          "Save each client’s and property’s instructions and details so your team knows how to care for them."
        ],
        [
          "Tasks and visits",
          "Organize pending work, assign team members and plan upcoming visits and maintenance dates."
        ],
        [
          "Teams and responsibilities",
          "Know who is doing each job and manage shifts, hours and tools with the features you enable."
        ],
        [
          "Photos, notes and history",
          "Keep a useful account of what was done, what changed and what still needs attention."
        ],
        [
          "Plants, assets and equipment",
          "Check the care or maintenance each item needs and look back at its history."
        ],
        [
          "Information for the client",
          "Share completed work through portals, reports and documents, depending on the features and access you enable."
        ]
      ]
    },
    "differences": {
      "eyebrow": "WHY HOMEGUIDE",
      "title": "Less to remember. Fewer questions. Easier handovers.",
      "body": "Instructions and history stay available even when someone else takes over caring for the property.",
      "items": [
        [
          "Information stays with the property",
          "Find instructions, tasks, photos and notes alongside the place they belong to, not scattered across conversations."
        ],
        [
          "The next person knows where to pick up",
          "They can review previous work and pending tasks without needing someone to retell the whole story."
        ],
        [
          "Photos and notes make the work clear",
          "Record the result of a visit and the details a checked-off task alone cannot show."
        ],
        [
          "The manager sees what is happening",
          "Review who did the work, what was completed and what is pending at the properties you manage."
        ],
        [
          "The client can understand the service they received",
          "Share the relevant service information so the client does not have to ask several people."
        ],
        [
          "History helps avoid repeating mistakes",
          "Check previous problems, changes and important notes before starting the next job."
        ]
      ]
    },
    "trust": {
      "eyebrow": "PRIVATE INFORMATION",
      "title": "Each person sees what they need to do their job.",
      "body": "Manage your team’s access and decide what information to share with the client.",
      "items": [
        [
          "Access that fits the job",
          "Owners, managers and teams have different tools and access based on their role and assignments."
        ],
        [
          "Information you choose to share",
          "The client portal shows the sections you enable. Internal notes are not included in the client portal."
        ],
        [
          "A useful history",
          "Visits and completed work keep photos, notes, team members and dates so you can look back at what happened."
        ]
      ]
    },
    "pricing": {
      "eyebrow": "PRICING",
      "title": "Choose how many properties you serve and what your team needs.",
      "body": "A property is a real place you care for: a house, villa, condominium or another client site. Optional features are charged per account, not per property.",
      "monthly": "Monthly",
      "annual": "Annual",
      "annualNote": "Pay for 10 months, use 12",
      "properties": "Properties",
      "perProperty": "per property / month",
      "extras": "Optional features",
      "extrasBody": "Nine optional features, priced per account. Choose only what your team needs.",
      "groupOperation": "Operation",
      "groupOperationBody": "Organize the team’s work, hours and upcoming tasks.",
      "groupManagement": "Management",
      "groupManagementBody": "Manage tools, client information, documents and billing.",
      "groupAnalysis": "Analysis",
      "groupAnalysisBody": "Review terrain and slopes with topography tools.",
      "groupSpecialized": "Specialized",
      "groupSpecializedBody": "Care for the plants you service. Sales, rentals or replacements depend on your setup, not on a separate charge.",
      "accountMonth": "account / month",
      "summary": "Your estimate",
      "dueMonthly": "per month",
      "dueAnnual": "billed annually",
      "saving": "Saving",
      "continue": "Create account and continue",
      "included": "Every account starts with",
      "includedItems": [
        "Clients, properties and assets",
        "Tasks, records and reports",
        "EN, ES and DE interface",
        "USD and CRC display"
      ],
      "decrease": "Decrease properties",
      "increase": "Increase properties",
      "catalogTitle": "More tools for your team’s work",
      "catalogBody": "Browse the available tools and choose what you need to care for your properties.",
      "catalogNote": "Availability depends on the features and setup you enable.",
      "capabilityCore": "Clients, properties and documents",
      "capabilityField": "Visits, tasks and teams",
      "capabilityCare": "Care and upcoming dates",
      "capabilityAdmin": "Client information and administration",
      "addon_field_operations": "Visits, assigned team members, photos and notes of completed work.",
      "addon_labor": "Team shifts, hours and rates, including cleaning routines.",
      "addon_reminders": "Reminders for tasks, maintenance and upcoming dates.",
      "addon_inventory": "Tools and supplies your team uses on the job.",
      "addon_client_portal": "Share the information you enable in each client’s portal.",
      "addon_reports_manuals": "Work reports and manuals to refer to and share.",
      "addon_topography": "Review terrain elevations and slopes.",
      "addon_financials": "Organize expenses, billing and payment records.",
      "addon_plant_care": "Check care instructions, dates and recommendations for each plant."
    },
    "faq": {
      "eyebrow": "FREQUENT QUESTIONS",
      "title": "Questions before the next visit",
      "items": [
        [
          "Is HomeGuide only for landscaping?",
          "No. It also serves maintenance teams, property managers, plant service companies and equipment maintenance teams. What they share is recurring work at the same properties."
        ],
        [
          "What happens when someone else takes over a property?",
          "Instructions, tasks, photos and notes stay with the property. With the appropriate access, the next person can review what was done and what is still pending."
        ],
        [
          "Can I save photos and notes from each visit?",
          "Yes. You can record photos and notes from visits and completed work, then find them later alongside the relevant property."
        ],
        [
          "Can the client see what was done?",
          "Yes, if you enable the client portal and the sections you want to share. Availability depends on the features you enable and the access you configure."
        ],
        [
          "Can I manage several properties and clients?",
          "Yes. You can organize multiple clients and the properties you care for on their behalf. The base price is per property; optional features are charged per account."
        ],
        [
          "Is it only for plants?",
          "No. Plant care is optional. You can also organize maintenance, tasks, visits and work in other parts of a property."
        ]
      ]
    },
    "final": {
      "title": "Make sure the next visit doesn’t start from scratch.",
      "body": "Organize each property, make the work clear and keep a history of what your team has already done.",
      "create": "Create account",
      "signIn": "Sign in"
    },
    "footer": "What each property needs, what was done and what comes next."
  },
  "de": {
    "seo": {
      "title": "HomeGuide | Die Arbeit an jeder Immobilie organisieren",
      "description": "HomeGuide bündelt Kundenanweisungen, offene Aufgaben und bisherige Arbeiten, damit Ihr Team weiß, was zu tun ist, was erledigt wurde und was als Nächstes ansteht."
    },
    "nav": {
      "how": "So funktioniert es",
      "audience": "Für wen",
      "capabilities": "Was Sie tun können",
      "pricing": "Preise",
      "signIn": "Anmelden",
      "create": "Konto erstellen",
      "menu": "Navigation öffnen"
    },
    "hero": {
      "eyebrow": "FÜR TEAMS, DIE IMMOBILIEN PFLEGEN UND INSTAND HALTEN",
      "title": "Damit alle wissen, was an jeder Immobilie zu tun ist.",
      "body": "HomeGuide bündelt die Anweisungen jedes Kunden, offene Aufgaben und die bisher erledigten Arbeiten. Ihr Team öffnet die Immobilie, sieht, was ansteht, hält das Ergebnis fest und macht weiter.",
      "support": "Für Gartenpflege, Instandhaltung, Immobilienverwaltung, Pflanzenpflege und andere regelmäßige Dienstleistungen.",
      "primary": "Konto erstellen",
      "secondary": "So funktioniert es",
      "imageAlt": "Eine Immobilie mit Gärten und Bereichen, die regelmäßig gepflegt und instand gehalten werden"
    },
    "problem": {
      "eyebrow": "DAS PROBLEM",
      "title": "Die Arbeit ist nicht das Problem. Sondern den Überblick zu behalten.",
      "body": "Jeder Kunde hat andere Regeln, Prioritäten und Details. Stehen diese nur in Chats, Tabellen oder im Gedächtnis einer Person, wird es schwieriger, den Service jedes Mal gut zu leisten.",
      "rows": [
        [
          "JEDER KUNDE IST ANDERS",
          "Intervalle, Bereiche, Wünsche, Ausnahmen und Aufgaben unterscheiden sich von Immobilie zu Immobilie."
        ],
        [
          "DAS PERSONAL WECHSELT",
          "Wenn ein Team, ein Verantwortlicher oder ein Dienstleister wechselt, muss die neue Person oft erst fragen, was zu tun ist."
        ],
        [
          "DANACH MUSS MAN ZUSAMMENSUCHEN, WAS PASSIERT IST",
          "Fotos, Nachrichten und Notizen liegen an verschiedenen Stellen. Verwaltung oder Kunde müssen nachfragen, was wann erledigt wurde und was noch offen ist."
        ]
      ]
    },
    "how": {
      "eyebrow": "SO FUNKTIONIERT ES",
      "title": "Jede Immobilie behält ihre Anweisungen und ihre Geschichte.",
      "body": "HomeGuide begleitet die Arbeit vom Kundenwunsch bis zu dem, was tatsächlich erledigt wurde.",
      "steps": [
        [
          "FESTHALTEN, WIE JEDE IMMOBILIE BETREUT WIRD",
          "Kunde, Immobilie, Bereiche, Pflanzen oder Geräte, Anweisungen, Wünsche und wichtige Details."
        ],
        [
          "ORGANISIEREN, WAS ZU TUN IST",
          "Besuche, wiederkehrende Aufgaben, Wartung, Verantwortliche und nächste Termine."
        ],
        [
          "ERLEDIGTE ARBEIT FESTHALTEN",
          "Fotos, Notizen, Uhrzeit, ausführende Person, vorgefundener Zustand und Probleme, die noch Aufmerksamkeit brauchen."
        ],
        [
          "ALLE AUF DEM LAUFENDEN HALTEN",
          "Team, Verwaltung und gegebenenfalls der Kunde können sehen, was erledigt wurde, was noch offen ist und was als Nächstes ansteht."
        ]
      ]
    },
    "connected": {
      "eyebrow": "DAS GEDÄCHTNIS JEDER IMMOBILIE",
      "title": "Wenn die Person wechselt, bleibt das Wissen.",
      "body": "Anweisungen, Arbeiten, Fotos und Notizen bleiben bei der Immobilie, zu der sie gehören. Die nächste Person kann dort weitermachen, wo die vorherige aufgehört hat.",
      "modelLabel": "Die Geschichte jedes Einsatzes",
      "modelNote": "Von den Kundenanweisungen bis zu den Fotos und Notizen des Besuchs. Bereich oder Gegenstand werden bei Bedarf zugeordnet.",
      "model": [
        "Kunde",
        "Immobilie",
        "Bereich / Gegenstand",
        "Arbeit",
        "Verantwortlich",
        "Besuchsbericht"
      ],
      "routes": []
    },
    "audience": {
      "eyebrow": "FÜR WEN",
      "title": "Für Teams, die immer wieder dieselben Immobilien betreuen.",
      "body": "HomeGuide ist besonders hilfreich, wenn jeder Kunde oder jede Immobilie regelmäßige Arbeit braucht und wichtige Details nicht vom Gedächtnis einer einzelnen Person abhängen sollten.",
      "groups": [
        [
          "Garten- und Landschaftspflege",
          "Halten Sie fest, wie jeder Garten gepflegt wird, planen Sie Schnittarbeiten und Besuche und hinterlassen Sie Fotos und Notizen für das nächste Team."
        ],
        [
          "Instandhaltung von Immobilien",
          "Organisieren Sie Kontrollen und Reparaturen, weisen Sie Aufgaben zu und halten Sie fest, was gelöst wurde und was noch offen ist."
        ],
        [
          "Immobilienverwaltung, Villen und Wohnanlagen",
          "Bündeln Sie die Anweisungen jeder Immobilie und prüfen Sie die Arbeiten von Personal und Dienstleistern, auch bei Personalwechsel."
        ],
        [
          "Pflanzenpflege und Innenraumbegrünung",
          "Sehen Sie, welche Pflege jede Pflanze braucht, erfassen Sie Besuche und halten Sie Zustand und Austausch fest."
        ],
        [
          "Wartung von Anlagen und Geräten",
          "Speichern Sie Wartungsanweisungen für Pumpen, Bewässerung und andere Geräte zusammen mit Aufgaben und bisherigen Reparaturen."
        ]
      ]
    },
    "visibility": {
      "eyebrow": "AUF EINEN BLICK",
      "title": "Eine Immobilie öffnen und sehen, was gerade ansteht.",
      "body": "Sehen Sie, was der Kunde braucht, wann der letzte Besuch war, was erledigt wurde, von wem, welche Fotos vorliegen und was als Nächstes ansteht.",
      "labels": [
        "Kunde",
        "Immobilie",
        "Kundenanweisung",
        "Letzter Besuch",
        "Erledigte Arbeit",
        "Verantwortlich",
        "Fotos",
        "Notiz",
        "Nächster Besuch",
        "Offen"
      ],
      "values": [
        "Villa Mar",
        "Haus 12",
        "Hecken niedrig halten, ohne den Eingang zu versperren",
        "6. Okt.",
        "Heckenschnitt + Bewässerung geprüft",
        "Daniel",
        "4",
        "Ventil im Nordbereich muss geprüft werden",
        "Donnerstag",
        "Bewässerungsventil prüfen"
      ],
      "demo": "Beispiel eines Besuchs · fiktive Daten"
    },
    "capabilities": {
      "eyebrow": "WAS SIE TUN KÖNNEN",
      "title": "Damit die Arbeit nicht vom Gedächtnis abhängt.",
      "body": "Bündeln Sie, was Ihr Team vor dem Besuch braucht und was danach klar sein muss.",
      "items": [
        [
          "Kunden und Immobilien",
          "Speichern Sie Anweisungen und Details jedes Kunden und jeder Immobilie, damit Ihr Team weiß, wie sie betreut werden."
        ],
        [
          "Aufgaben und Besuche",
          "Organisieren Sie offene Arbeiten, weisen Sie Verantwortliche zu und planen Sie nächste Besuche und Wartungstermine."
        ],
        [
          "Teams und Verantwortliche",
          "Sehen Sie, wer welche Arbeit übernimmt, und verwalten Sie mit den aktivierten Funktionen Schichten, Stunden und Werkzeuge."
        ],
        [
          "Fotos, Notizen und bisherige Arbeiten",
          "Halten Sie fest, was erledigt wurde, was sich verändert hat und was noch Aufmerksamkeit braucht."
        ],
        [
          "Pflanzen, Anlagen und Geräte",
          "Prüfen Sie, welche Pflege oder Wartung jedes Element braucht und was bisher daran gemacht wurde."
        ],
        [
          "Informationen für den Kunden",
          "Teilen Sie erledigte Arbeiten über Portale, Berichte und Dokumente, je nach aktivierten Funktionen und freigegebenem Zugriff."
        ]
      ]
    },
    "differences": {
      "eyebrow": "WARUM HOMEGUIDE",
      "title": "Weniger merken. Weniger nachfragen. Einfacher weitermachen.",
      "body": "Anweisungen und bisherige Arbeiten bleiben verfügbar, auch wenn jemand anderes die Betreuung übernimmt.",
      "items": [
        [
          "Die Informationen bleiben bei der Immobilie",
          "Anweisungen, Aufgaben, Fotos und Notizen finden Sie beim zugehörigen Ort, nicht in verstreuten Gesprächen."
        ],
        [
          "Die nächste Person weiß, wo sie weitermachen kann",
          "Sie kann frühere Arbeiten und offene Aufgaben ansehen, ohne dass jemand die ganze Geschichte erzählen muss."
        ],
        [
          "Fotos und Notizen machen die Arbeit verständlich",
          "Halten Sie das Ergebnis eines Besuchs und die Details fest, die eine abgehakte Aufgabe allein nicht zeigt."
        ],
        [
          "Die Verwaltung sieht, was passiert",
          "Prüfen Sie Verantwortliche, erledigte Arbeiten und offene Aufgaben Ihrer Immobilien."
        ],
        [
          "Der Kunde versteht, was geleistet wurde",
          "Teilen Sie die passenden Informationen zum Service, damit der Kunde nicht bei mehreren Personen nachfragen muss."
        ],
        [
          "Frühere Einträge helfen, Fehler nicht zu wiederholen",
          "Lesen Sie frühere Probleme, Änderungen und wichtige Notizen, bevor die nächste Arbeit beginnt."
        ]
      ]
    },
    "trust": {
      "eyebrow": "PRIVATE INFORMATIONEN",
      "title": "Jede Person sieht, was sie für ihre Arbeit braucht.",
      "body": "Verwalten Sie den Zugriff Ihres Teams und entscheiden Sie, welche Informationen Sie mit dem Kunden teilen.",
      "items": [
        [
          "Zugriff passend zur Arbeit",
          "Eigentümer, Verwaltung und Teams haben je nach Rolle und zugewiesenen Aufgaben unterschiedliche Werkzeuge und Zugriffe."
        ],
        [
          "Sie entscheiden, was Sie teilen",
          "Das Kundenportal zeigt die Bereiche, die Sie freigeben. Interne Notizen sind nicht im Kundenportal enthalten."
        ],
        [
          "Eine hilfreiche Übersicht bisheriger Arbeiten",
          "Besuche und abgeschlossene Arbeiten halten Fotos, Notizen, Verantwortliche und Termine fest, damit Sie später nachsehen können, was passiert ist."
        ]
      ]
    },
    "pricing": {
      "eyebrow": "PREISE",
      "title": "Wählen Sie Ihre Immobilienanzahl und die Funktionen für Ihr Team.",
      "body": "Eine Immobilie ist ein konkreter Ort, den Sie betreuen: ein Haus, eine Villa, eine Wohnanlage oder ein anderer Kundenstandort. Optionale Funktionen werden pro Konto berechnet, nicht pro Immobilie.",
      "monthly": "Monatlich",
      "annual": "Jährlich",
      "annualNote": "10 Monate zahlen, 12 nutzen",
      "properties": "Immobilien",
      "perProperty": "pro Immobilie / Monat",
      "extras": "Optionale Funktionen",
      "extrasBody": "Neun optionale Funktionen zum Preis pro Konto. Wählen Sie nur, was Ihr Team braucht.",
      "groupOperation": "Betrieb",
      "groupOperationBody": "Organisieren Sie die Arbeit, Stunden und nächsten Aufgaben Ihres Teams.",
      "groupManagement": "Verwaltung",
      "groupManagementBody": "Verwalten Sie Werkzeuge, Kundeninformationen, Dokumente und Abrechnung.",
      "groupAnalysis": "Analyse",
      "groupAnalysisBody": "Prüfen Sie Gelände und Gefälle mit Topografiewerkzeugen.",
      "groupSpecialized": "Spezialisiert",
      "groupSpecializedBody": "Pflege für die betreuten Pflanzen. Verkauf, Vermietung oder Austausch hängen von Ihrer Einrichtung ab, nicht von einer separaten Gebühr.",
      "accountMonth": "Konto / Monat",
      "summary": "Ihre Schätzung",
      "dueMonthly": "pro Monat",
      "dueAnnual": "jährlich berechnet",
      "saving": "Ersparnis",
      "continue": "Konto erstellen und fortfahren",
      "included": "Grundlage jedes Kontos",
      "includedItems": [
        "Kunden, Immobilien und Anlagen",
        "Aufgaben, Protokolle und Berichte",
        "Oberfläche EN, ES und DE",
        "Anzeige in USD und CRC"
      ],
      "decrease": "Immobilien reduzieren",
      "increase": "Immobilien erhöhen",
      "catalogTitle": "Weitere Werkzeuge für die Arbeit Ihres Teams",
      "catalogBody": "Sehen Sie sich die verfügbaren Werkzeuge an und wählen Sie, was Sie für Ihre Immobilien brauchen.",
      "catalogNote": "Die Verfügbarkeit hängt von den aktivierten Funktionen und Einstellungen ab.",
      "capabilityCore": "Kunden, Immobilien und Dokumente",
      "capabilityField": "Besuche, Aufgaben und Teams",
      "capabilityCare": "Pflege und nächste Termine",
      "capabilityAdmin": "Kundeninformationen und Verwaltung",
      "addon_field_operations": "Besuche, Verantwortliche, Fotos und Notizen zur erledigten Arbeit.",
      "addon_labor": "Schichten, Stunden und Tarife des Teams, auch für Reinigungsroutinen.",
      "addon_reminders": "Erinnerungen an Aufgaben, Wartung und nächste Termine.",
      "addon_inventory": "Werkzeuge und Materialien, die Ihr Team bei der Arbeit nutzt.",
      "addon_client_portal": "Teilen Sie die Informationen, die Sie im jeweiligen Kundenportal freigeben.",
      "addon_reports_manuals": "Arbeitsberichte und Handbücher zum Nachschlagen und Teilen.",
      "addon_topography": "Prüfen Sie Höhen und Gefälle des Geländes.",
      "addon_financials": "Organisieren Sie Ausgaben, Rechnungen und Zahlungseinträge.",
      "addon_plant_care": "Sehen Sie Pflegehinweise, Termine und Empfehlungen für jede Pflanze."
    },
    "faq": {
      "eyebrow": "HÄUFIGE FRAGEN",
      "title": "Fragen vor dem nächsten Besuch",
      "items": [
        [
          "Ist HomeGuide nur für Gartenpflege?",
          "Nein. Auch Instandhaltungsteams, Immobilienverwaltungen, Pflanzenservices und Gerätewartungsteams können es nutzen. Gemeinsam ist ihnen die regelmäßige Arbeit an denselben Immobilien."
        ],
        [
          "Was passiert, wenn eine neue Person die Betreuung übernimmt?",
          "Anweisungen, Aufgaben, Fotos und Notizen bleiben bei der Immobilie. Mit dem passenden Zugriff kann die neue Person sehen, was erledigt wurde und was noch offen ist."
        ],
        [
          "Kann ich Fotos und Notizen zu jedem Besuch speichern?",
          "Ja. Sie können Fotos und Notizen zu Besuchen und abgeschlossenen Arbeiten festhalten und später bei der jeweiligen Immobilie wiederfinden."
        ],
        [
          "Kann der Kunde sehen, was erledigt wurde?",
          "Ja, wenn Sie das Kundenportal und die gewünschten Bereiche freigeben. Die Verfügbarkeit hängt von den aktivierten Funktionen und eingerichteten Zugriffsrechten ab."
        ],
        [
          "Kann ich mehrere Immobilien und Kunden verwalten?",
          "Ja. Sie können mehrere Kunden und deren betreute Immobilien organisieren. Der Grundpreis gilt pro Immobilie; optionale Funktionen werden pro Konto berechnet."
        ],
        [
          "Ist es nur für Pflanzen?",
          "Nein. Pflanzenpflege ist optional. Sie können auch Instandhaltung, Aufgaben, Besuche und Arbeiten an anderen Teilen einer Immobilie organisieren."
        ]
      ]
    },
    "final": {
      "title": "Damit der nächste Besuch nicht bei null beginnt.",
      "body": "Organisieren Sie jede Immobilie, machen Sie die Aufgaben klar und halten Sie fest, was Ihr Team bereits erledigt hat.",
      "create": "Konto erstellen",
      "signIn": "Anmelden"
    },
    "footer": "Was jede Immobilie braucht, was erledigt wurde und was als Nächstes ansteht."
  }
};
