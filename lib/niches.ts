import type { Upload } from './youtube/client';

export const niches = [
  { id: 'moto', label: 'Motovlogging', keywords: ['motovlog', 'helmet', 'triumph speed', 'rtr 310', 'bike review', 'motorcycle'], peers: ['JSFilmsIndia', 'BikerNiladri', 'DinosVault'] },
  { id: 'gaming', label: 'Gaming', keywords: ['valorant', 'gaming', 'minecraft', 'gameplay', 'bgmi', 'counter-strike'], peers: ['TechnoGamerzOfficial', 'TotalGaming093', 'CarryisLive'] },
  { id: 'tech', label: 'Tech & AI', keywords: ['react js', 'javascript', 'next.js', 'laptop', 'smartphone', 'openai', 'coding', 'ai tools'], peers: ['Fireship', 'mkbhd', 'ThePrimeagen'] },
  { id: 'fitness', label: 'Fitness', keywords: ['gym', 'workout', 'protein', 'fitness', 'bodybuilding'], peers: ['JeffNippard', 'RenaissancePeriodization', 'ATHLEANX'] },
  { id: 'finance', label: 'Personal Finance', keywords: ['mutual fund', 'investing', 'personal finance', 'index fund', 'stock market'], peers: ['warikoo', 'PranjalKamra', 'CArachanaRanade'] },
  { id: 'food', label: 'Food', keywords: ['recipe', 'cooking', 'biryani', 'meal prep', 'street food'], peers: ['YourFoodLab', 'ranveerbrar', 'HebbarsKitchen'] },
  { id: 'travel', label: 'Travel', keywords: ['travel', 'itinerary', 'backpacking', 'trekking', 'hotel'], peers: ['MountainTrekker', 'TanyaKhanijow', 'KritikaGoel'] },
  { id: 'vlog', label: 'Vlogging', keywords: ['daily vlog', 'day in my life', 'weekly vlog'], peers: ['CaseyNeistat', 'souravjoshivlogs7028', 'PeterMcKinnon'] },
  { id: 'beauty', label: 'Beauty', keywords: ['makeup', 'skincare', 'concealer', 'foundation'], peers: ['NikkieTutorials', 'LisaEldridge', 'JamesCharles'] },
  { id: 'fashion', label: 'Fashion', keywords: ['fashion', 'outfit', 'wardrobe', 'streetwear'], peers: ['timdessaint', 'DanielSimmons', 'BlissFoster'] },
  { id: 'education', label: 'Education', keywords: ['exam', 'study tips', 'class 12', 'tutorial', 'learn'], peers: ['khanacademy', 'crashcourse', '3blue1brown'] },
  { id: 'photo', label: 'Photography', keywords: ['photography', 'color grading', 'premiere pro', 'camera lens'], peers: ['PeterMcKinnon', 'filmriot', 'MangoStreet'] },
  { id: 'sports', label: 'Sports', keywords: ['cricket', 'football', 'formula 1', 'pickleball', 'tennis'], peers: ['formula1', 'ICC', 'ESPN'] },
  { id: 'music', label: 'Music', keywords: ['guitar', 'piano', 'music production', 'songwriting'], peers: ['RickBeato', 'JustinGuitar', 'PianoteOfficial'] },
  { id: 'diy', label: 'DIY & Design', keywords: ['woodworking', 'craft', 'interior design', 'diy'], peers: ['Iliketomakestuff', 'DIYCreators', 'theSorryGirls'] }
] as const;

export function suggestNiche(uploads: Pick<Upload, 'title' | 'description'>[]) {
  const titles = uploads.map(upload => upload.title.toLowerCase());
  const details = uploads.map(upload => upload.description.toLowerCase());
  const ranked = niches.map(niche => ({
    niche,
    score: niche.keywords.reduce((score, word) => score + titles.filter(title => title.includes(word)).length * 3
      + details.filter(description => description.includes(word)).length, 0)
  })).sort((a, b) => b.score - a.score);
  return ranked[0].score > 0 ? ranked[0].niche : null;
}
