import fs from 'node:fs';
const S1 = {
  id: 's1', slug: 'la-esposa-invisible', title: 'La Esposa Invisible', niche: 'Venganza de la esposa',
  logline: 'Él la humilló delante de todos. Ella volvió siendo la dueña de su empresa.',
  synopsis: 'Lucía soportó cinco años de desprecio en la mansión Valcárcel. La noche en que su marido le pide el divorcio para casarse con su amante, Lucía descubre que es la heredera secreta del grupo que está a punto de comprar la empresa de su familia política. Ahora tiene un plan… y nadie la verá venir.',
  totalEpisodes: 24, style: 'Realista cinematográfico, tonos fríos azulados con acentos dorados',
  characters: [
    { id: 'lucia', name: 'Lucía Ferrer', role: 'Protagonista', description: 'Esposa humillada, brillante y paciente. 29 años.' },
    { id: 'alvaro', name: 'Álvaro Valcárcel', role: 'Marido', description: 'CEO arrogante, heredero de una familia en decadencia.' },
    { id: 'vera', name: 'Vera Montes', role: 'Amante', description: 'Influencer ambiciosa que quiere el apellido Valcárcel.' },
  ],
};
const S2 = {
  id: 's2', slug: 'el-millonario-del-turno-de-noche', title: 'El Millonario del Turno de Noche', niche: 'Millonario secreto',
  logline: 'De día es el conserje al que todos ignoran. De noche, el dueño de todo.',
  synopsis: 'Mateo friega los suelos del hotel Imperial mientras sus compañeros se burlan de él. Nadie sabe que su abuelo le dejó el hotel… con una condición: trabajar un año en el puesto más bajo sin revelar quién es. Cuando conoce a Sara, la recepcionista que le defiende, el secreto empieza a pesar demasiado.',
  totalEpisodes: 30, style: 'Neón nocturno, contraste alto, dorados y rojos',
  characters: [
    { id: 'mateo', name: 'Mateo Rivas', role: 'Protagonista', description: 'Heredero oculto, humilde y observador. 31 años.' },
    { id: 'sara', name: 'Sara León', role: 'Interés amoroso', description: 'Recepcionista valiente con un pasado difícil.' },
    { id: 'gonzalo', name: 'Gonzalo Ibarra', role: 'Antagonista', description: 'Director del hotel, corrupto y cruel.' },
  ],
};
const t1 = ['La firma del divorcio','La cena de la vergüenza','Una llamada desde Ginebra','El collar de la abuela','La nueva accionista','Vera mueve ficha','La prueba en el móvil','Junta de emergencia','La máscara cae','¿Quién es la señora Ferrer?','El contrato trampa','Bajo la lluvia','El hermano perdido','Fiesta de compromiso','La grabación','Un aliado inesperado','Ruina','La suegra suplica','El embarazo falso','Juicio público','La última cena','Fuego en la mansión','Todo vuelve','Renacer'];
const t2 = ['El conserje invisible','La llave maestra','Sara lo defiende','El testamento','Suite 1801','El director sospecha','Una cita imposible','Cámaras de seguridad','El despido','La noche del incendio','El abogado','Doble vida','Gonzalo descubre algo','La gala benéfica','El beso en la azotea','Chantaje','La verdad a medias','Sara se va','El consejo','Revelación','Caída de Gonzalo','Corazón roto','El pasado de Sara','Traición en familia','La subasta','El anillo','Secuestro','Rescate','La rueda de prensa','Dueño de todo'];
const hooks1 = ['Firmó el divorcio sonriendo… porque él no sabía lo que acababa de perder.','La humillaron en la mesa. Diez minutos después, el banco llamó.','"Señora Ferrer, su abuelo ha muerto. Ahora usted es la dueña."','La amante llevaba puesto el collar que le robaron a su madre.','Entró en la junta y todos se pusieron de pie. Excepto él.'];
const hooks2 = ['Le tiraron el café encima. No sabían que firmaba sus nóminas.','Encontró una llave dorada en su taquilla… y una nota.','Ella le defendió delante de todos. Él juró protegerla.','"Un año sin revelar quién eres. Si fallas, lo pierdes todo."','Detrás de la puerta 1801 estaba el secreto de su abuelo.'];
const script1 = [
`## ESCENA 1 — Despacho de la mansión Valcárcel. Noche.
*La lluvia golpea los ventanales. Álvaro desliza unos papeles sobre la mesa.*

**ÁLVARO:** Firma. Vera y yo nos casamos en junio.
**LUCÍA:** (en voz baja) Cinco años, Álvaro. Cinco años.
**ÁLVARO:** Cinco años manteniéndote. Deberías darme las gracias.

*Vera aparece en la puerta con una copa de vino, sonriendo.*

**VERA:** ¿Todavía no ha firmado? Qué patética.
**LUCÍA:** (coge el bolígrafo, sonríe) Tienes razón. Ya era hora.

*Lucía firma. Su móvil vibra: "Llamada entrante — Ginebra".*

**LUCÍA:** Disculpad. Tengo que contestar… a mi abogado.
**ÁLVARO:** ¿Tu abogado? Tú no tienes ni un euro.

*Lucía sale. Cierra la puerta. Responde.*

**VOZ (teléfono):** Señorita Ferrer, ha llegado el momento. El grupo Aurum es suyo.`,
`## ESCENA 1 — Comedor de la mansión. Noche.
*La familia Valcárcel cena. Lucía sirve el vino como una criada.*

**SUEGRA:** Al menos sabe servir. Para algo ha valido.
**VERA:** Lucía, querida, ¿me traes otra servilleta? Esta tiene tu olor.

*Risas. Álvaro no levanta la vista del plato.*

**LUCÍA:** Por supuesto. Disfrutad… mientras podáis.
**ÁLVARO:** ¿Qué has dicho?

*Suena el teléfono de Álvaro. Es el banco.*

**ÁLVARO:** (palidece) ¿Cómo que han congelado el crédito? ¿Quién lo ha comprado?

*Lucía, en la cocina, guarda su móvil. En la pantalla: "Operación completada".*`,
`## ESCENA 1 — Aeropuerto de Ginebra. Día.
*Lucía baja del avión. Un hombre de traje la espera con un paraguas negro.*

**ABOGADO:** Su abuelo dejó instrucciones claras. Nadie debía saber quién era usted hasta hoy.
**LUCÍA:** ¿Y ahora?
**ABOGADO:** Ahora es la mujer más rica de Europa.

*Le entrega un sobre. Dentro, una foto: Álvaro y Vera firmando un contrato con Aurum.*

**LUCÍA:** Quieren venderle la empresa a mi grupo…
**ABOGADO:** Y la reunión es mañana. Con usted.`,
];
const script2 = [
`## ESCENA 1 — Vestíbulo del hotel Imperial. Noche.
*Mateo friega el mármol. Un ejecutivo pisa el suelo mojado a propósito.*

**EJECUTIVO:** Oye, conserje. Te has dejado una mancha. (le tira el café encima)
**MATEO:** (respira hondo) Ahora mismo lo limpio, señor.

*Sara sale de detrás del mostrador de recepción.*

**SARA:** ¡Basta! Él está haciendo su trabajo. ¿Cuál es el suyo?
**EJECUTIVO:** ¿Sabes con quién hablas, niña?
**SARA:** Con un cliente que acaba de perder su reserva.

*El ejecutivo se marcha furioso. Gonzalo, el director, lo ha visto todo.*

**GONZALO:** León, a mi despacho. Y tú, Rivas… estás despedido.

*Mateo saca del bolsillo una tarjeta negra con un sello dorado: IMPERIAL — PROPIETARIO.*`,
`## ESCENA 1 — Vestuario del personal. Madrugada.
*Mateo abre su taquilla. Hay una llave dorada y una nota.*

**NOTA (voz del abuelo):** Si estás leyendo esto, ya sabes quién eres. Suite 1801. No se lo digas a nadie.
**MATEO:** (susurra) Abuelo… ¿qué escondías?

*Pasos. Gonzalo aparece en la puerta.*

**GONZALO:** ¿Qué tienes ahí?
**MATEO:** Nada, señor. Las llaves del almacén.
**GONZALO:** Ya. Mañana a las ocho en mi despacho. Trae tus cosas.`,
];
const build = (s, titles, hooks, scripts) => ({ ...s, episodes: titles.map((title, i) => ({
  n: i + 1, title, hook: hooks[i] || `Episodio ${i + 1}: nada volverá a ser igual.`,
  durationSec: 70 + ((i * 37) % 90), script: scripts[i] || null, freeEpisode: i < 9,
})) });
fs.writeFileSync(new URL('../src/mock-data.json', import.meta.url), JSON.stringify([build(S1, t1, hooks1, script1), build(S2, t2, hooks2, script2)], null, 2));
console.log('mock ok');
