// Michigan snowmobile "what you need" facts.
//
// Every figure here was read from a Michigan DNR page on CHECKED_ON and is attached to the
// page it came from. Nothing is paraphrased from memory. If the DNR changes a rule, change it
// here: the page, the checker and the tests all read this file.
//
// What the DNR pages did NOT state is listed in NOT_COVERED rather than guessed. In particular
// there is no insurance rule, no lug-height rule and no registration fee in these sources.

export const CHECKED_ON = '2026-10-19';
export const CHECKED_ON_LONG = 'October 19, 2026';

const DNR = 'https://www.michigan.gov/dnr/things-to-do/snowmobiling';

export const SOURCES = {
  permits: { label: 'DNR: snowmobile permits and requirements', url: `${DNR}/permits-and-requirements` },
  fee: { label: 'DNR: trail permit fee change (May 11, 2026)', url: 'https://www.michigan.gov/dnr/about/newsroom/releases/2026/05/11/required-five-year-cpi-adjustment-prompts-change-in-snowmobile-trail-permit-fees' },
  age: { label: 'DNR: snowmobile age restrictions', url: `${DNR}/age-restrictions` },
  certificate: { label: 'DNR: snowmobile safety certificate', url: `${DNR}/safety-certificate` },
  freeWeekend: { label: 'DNR: Free Snowmobiling Weekend', url: `${DNR}/free-snowmobiling-weekend` },
  rules: { label: 'DNR: snowmobile rules and regulations', url: `${DNR}/rules` },
  handbook: { label: 'DNR Snowmobile Handbook (PDF)', url: 'https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/LED/digests/Snowmobile_Regulations.pdf' },
  home: { label: 'DNR: snowmobiling', url: `${DNR}` },
  where: { label: 'DNR: where to snowmobile', url: `${DNR}/where` },
  elicense: { label: 'Michigan DNR eLicense', url: 'https://www.mdnr-elicense.com/' },
  misorva: { label: 'Michigan Snowmobile & ORV Association', url: 'https://misorva.org/' },
  sos: { label: 'Michigan Secretary of State', url: 'https://www.michigan.gov/sos' },
  course: { label: 'Online snowmobile safety course', url: 'https://snowmobile-ed.com/michigan' },
};

export const FACTS = {
  permit: {
    fee: '$65',
    previousFee: '$52',
    feeBasis: 'a required five-year inflation (CPI) adjustment under Public Act 400 of 2008',
    onSale: 'Sept. 1',
    validFrom: 'Oct. 1',
    validTo: 'Sept. 30',
    sticker: 'permanently affixed to the forward half of the snowmobile, directly above or below the headlight',
    mailing: 'The sticker is mailed within 10 to 15 business days when you buy through eLicense.',
    where: ['Online through the DNR eLicense site', 'Online through the Michigan Snowmobile & ORV Association (MISORVA)', 'In person at DNR license agents and dealers'],
  },
  registration: {
    authority: 'Michigan Secretary of State',
    years: 3,
    decals: 'the two registration decals on each side of the forward half of the cowl, above the footwell',
  },
  season: { opens: 'Dec. 1', closes: 'Mar. 31', note: 'State-designated trails are open Dec. 1 to Mar. 31, and trail grooming occurs when there is enough snow on the ground.' },
  certificate: { fromAge: 12, toAge: 16 },
  helmet: 'a Department of Transportation-approved crash helmet',
  lights: 'a lighted headlight and taillight at all times during operation',
  mufflers: [
    'Snowmobiles made after July 1, 1977 must have a muffler that does not exceed 78 decibels at 50 feet (1974 SAE J-192a).',
    'Snowmobiles made after July 1, 1980 and sold or offered for sale in Michigan must have a muffler that does not exceed 88 decibels (2004 SAE J2567).',
  ],
};

export const NOT_COVERED = [
  'Insurance: the DNR pages I read do not state an insurance rule.',
  'Registration fees: the DNR page does not list the Secretary of State fee.',
  'Lug (track traction) height and other equipment limits: see the DNR Snowmobile Handbook.',
  'Local ordinances, road-crossing and private-land permission rules: see the Handbook and ask the landowner or county.',
];

export const OPTIONS = {
  home: [
    { id: 'mi', label: 'I live in Michigan' },
    { id: 'out', label: 'I live outside Michigan' },
  ],
  age: [
    { id: 'adult', label: '17 or older' },
    { id: 'teen', label: '12 to 16' },
    { id: 'child', label: 'Under 12' },
  ],
  where: [
    { id: 'public', label: 'DNR trails and other public land' },
    { id: 'free', label: 'DNR trails during Free Snowmobiling Weekend' },
    { id: 'ice', label: 'Only crossing frozen public water to ice fish' },
    { id: 'private', label: 'Only on land I own or control' },
  ],
};
