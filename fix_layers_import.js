const fs = require('fs');
let content = fs.readFileSync('app/company/page.tsx', 'utf8');
content = content.replace(
  'import { CheckCircle2, ChevronDown, ChevronUp, Building2, Store, Star, Zap, Megaphone, ArrowRight } from "lucide-react";',
  'import { CheckCircle2, ChevronDown, ChevronUp, Building2, Store, Star, Zap, Megaphone, ArrowRight, Layers } from "lucide-react";'
);
fs.writeFileSync('app/company/page.tsx', content, 'utf8');
console.log('완료');
