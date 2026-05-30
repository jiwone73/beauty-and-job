const fs = require('fs');
let content = fs.readFileSync('app/company/dashboard/page.tsx', 'utf8');

// 1. state 추가
content = content.replace(
  `  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);`,
  `  const [stats, setStats] = useState<Stats | null>(null);
  const [jobs, setJobs] = useState<JobItem[]>([]);
  const [applicants, setApplicants] = useState<ApplicantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | "BOTH" | null>(null);
  const [jobTypeTab, setJobTypeTab] = useState<"전체" | "OFFICE" | "STORE">("전체");`
);

// 2. useEffect에 회사 타입 조회 추가
content = content.replace(
  `    const headers = { Authorization: \`Bearer \${token}\` };
    Promise.all([
      fetch("/api/company/dashboard/stats", { headers }).then((r) => r.json()),`,
  `    const headers = { Authorization: \`Bearer \${token}\` };
    fetch("/api/company/me", { headers })
      .then((r) => r.json())
      .then((res) => { if (res.success) setCompanyType(res.data.company_type); })
      .catch(console.error);
    Promise.all([
      fetch("/api/company/dashboard/stats", { headers }).then((r) => r.json()),`
);

// 3. 탭 변경 시 stats 재조회하는 useEffect 추가 (기존 useEffect 끝난 뒤)
content = content.replace(
  `      .catch((e) => console.error("[dashboard load]", e))
      .finally(() => setLoading(false));
  }, []);`,
  `      .catch((e) => console.error("[dashboard load]", e))
      .finally(() => setLoading(false));
  }, []);

  // 기업/매장 탭 변경 시 stats 재조회
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const headers = { Authorization: \`Bearer \${token}\` };
    const query = jobTypeTab === "전체" ? "" : \`?job_type=\${jobTypeTab}\`;
    fetch(\`/api/company/dashboard/stats\${query}\`, { headers })
      .then((r) => r.json())
      .then((res) => { if (res.success) setStats(res.data); })
      .catch(console.error);
  }, [jobTypeTab]);`
);

fs.writeFileSync('app/company/dashboard/page.tsx', content, 'utf8');
console.log('완료');
