export type FolioTarget = {
  pile: 'animating' | 'branding' | 'speaking' | 'writing'
  title?: string
  badge?: string
}

const MAP: { url: string; target: FolioTarget }[] = [
  {
    url: '/blog/designing-ai-beyond-conversational-interfaces',
    target: { pile: 'writing', title: 'when words cannot describe' },
  },
  {
    url: '/blog/friction-feature-machine-learning-algorithms',
    target: { pile: 'writing', title: 'using friction as a feature' },
  },
  {
    url: '/blog/designing-algorithm-friendly-interfaces',
    target: { pile: 'writing', title: 'designing algorithm-friendly interfaces' },
  },
  {
    url: 'https://play.headliner.app/podcast/1de99e587cbc4afb87a2ae11cad50688/episode/https%3a%2f%2fpinecast.com%2fguid%2f25ad7cbb-cfcf-4c8f-b2a9-e9513aca0989',
    target: { pile: 'speaking', title: 'product explained asks me about headliner' },
  },
  {
    url: 'https://www.workspaces.xyz/p/299-maximillian-piras',
    target: { pile: 'speaking', title: 'workspaces visits my home office' },
  },
  {
    url: 'https://giphy.com/maximilliannyc',
    target: { pile: 'animating', title: 'various gif commissions' },
  },
  {
    url: 'https://www.youtube.com/watch?v=i1jvn3bsmem',
    target: { pile: 'animating', title: 'ryuichi sakamoto music video' },
  },
  {
    url: 'https://www.maximillian.nyc/illo.html',
    target: { pile: 'animating' },
  },
  {
    url: 'https://www.maximillian.nyc/id.html',
    target: { pile: 'branding' },
  },
  {
    url: 'https://www.thetokyoiter.com/2016-2020#/gallerymx',
    target: { pile: 'animating', title: 'cover animation' },
  },
  {
    url: 'https://www.youtube.com/watch?v=bbvrq7c-8iu',
    target: { pile: 'animating', title: 'ryuichi sakamoto music video' },
  },
  {
    url: './assets/img/consabn_v4.gif',
    target: { pile: 'animating', title: 'consequence ft. royce da 5\'9" cover' },
  },
  {
    url: 'https://www.youtube.com/watch?v=yinnhhag6lq',
    target: { pile: 'animating', title: 'saüd ft. king los visualizer' },
  },
  {
    url: 'https://www.youtube.com/watch?v=6e9snenpaku',
    target: { pile: 'animating', title: 'artist-in-residence commission' },
  },
  {
    url: './assets/img/homeanimation8tracks.webm',
    target: { pile: 'animating', title: '"playlists by people" campaign' },
  },
  {
    url: './assets/img/stilllistening.webm',
    target: { pile: 'animating', title: '"still listening?" graphic' },
  },
  {
    url: './assets/id/atcq_v66e.webp',
    target: { pile: 'branding', title: 'monogram', badge: 'a tribe called quest' },
  },
  {
    url: './assets/id/athenian_editp.webp',
    target: { pile: 'branding', title: 'logomark', badge: 'athenian' },
  },
  {
    url: './assets/img/vinyleyeinsta.webp',
    target: { pile: 'branding', title: 'mission statement' },
  },
  {
    url: './assets/id/8trackstape.webp',
    target: { pile: 'branding', title: 'anniversary poster' },
  },
  {
    url: './assets/img/8tracksicons.webp',
    target: { pile: 'branding', title: 'iconset' },
  },
  {
    url: './assets/id/8trackssketchbooks.webp',
    target: { pile: 'branding', title: 'branded sketchbooks' },
  },
  {
    url: './assets/id/lostcatneon1.webp',
    target: { pile: 'branding', title: 'logomark', badge: 'lost cat' },
  },
  {
    url: './assets/id/lostcatlogos.webm',
    target: { pile: 'branding', title: 'logotypes' },
  },
  {
    url: './assets/id/lostcatads.webp',
    target: { pile: 'branding', title: 'guerrilla marketing' },
  },
  {
    url: './assets/img/catintosh.webp',
    target: { pile: 'branding', title: 'catintosh graphic' },
  },
  {
    url: './assets/id/laborshirt1.webp',
    target: { pile: 'branding', title: 'graphic tee' },
  },
  {
    url: './assets/id/bluelondon.webm',
    target: { pile: 'branding', title: 'brand kit' },
  },
  {
    url: './assets/id/ids.webp',
    target: { pile: 'branding', title: 'logotype' },
  },
  {
    url: './assets/id/westpoint.webp',
    target: { pile: 'branding', title: 'rugby crest' },
  },
  {
    url: './assets/id/damnjackals_vinylmock.webp',
    target: { pile: 'branding', title: 'band logo' },
  },
  {
    url: 'https://www.youtube.com/watch?v=bztd0yyagcq',
    target: { pile: 'speaking', title: 'the bitter layout' },
  },
  {
    url: 'https://www.youtube.com/watch?v=fiqfhegwbpa',
    target: { pile: 'speaking', title: 'can nfts save artists from ai' },
  },
  {
    url: 'https://play.headliner.app/podcast/8ee932b5444f4cb186230b1a2a8b0cf9/episode/lne%3ac84e42238ce24001b7a1fba3365c50c7',
    target: { pile: 'speaking', title: 'experience by design' },
  },
]

export function targetForCardUrl(cardURL: string | undefined): FolioTarget | null {
  if (!cardURL) return null
  const key = cardURL.trim().replace(/\/$/, '').toLowerCase()
  return MAP.find((row) => row.url === key)?.target ?? null
}
