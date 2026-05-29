const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');
const lines = content.split('\n');

// 324번줄 (0-indexed: 323) </div> 앞에 ))} 와 </div> 추가
lines.splice(323, 0, '                    ))}', '                  </div>');

fs.writeFileSync('app/profile/page.tsx', lines.join('\n'), 'utf8');
console.log('완료');
