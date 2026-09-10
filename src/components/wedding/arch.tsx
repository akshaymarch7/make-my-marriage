export function WeddingArch({ compact = false }: { compact?: boolean }) {
  return <svg viewBox={compact ? "0 0 200 95" : "0 0 200 200"} fill="none" aria-hidden="true">
    {compact ? <>
      <path d="M20 92Q50 32 100 18Q150 32 180 92M40 92Q65 48 100 33Q135 48 160 92" stroke="currentColor" strokeWidth="1.2" opacity=".5"/>
      <circle cx="100" cy="12" r="3" fill="#A37E3E"/>
      <path d="M100 0v5M100 47v8M96 51h8" stroke="#A37E3E"/>
    </> : <>
      <path d="M30 170V95C30 59 59 30 95 30H105C141 30 170 59 170 95V170" stroke="currentColor" strokeWidth="1.5" opacity=".35"/>
      <path d="M50 170V105C50 75 75 50 105 50C135 50 160 75 160 105V170" stroke="currentColor" strokeWidth="2"/>
      <path d="m100 18 5 10H95Z" fill="#A37E3E"/><circle cx="100" cy="14" r="2.5" fill="#A37E3E"/>
      <path d="M20 170h160M35 178h130" stroke="currentColor" opacity=".6"/>
      <circle cx="105" cy="100" r="14" stroke="#A37E3E" strokeDasharray="2 2"/><circle cx="105" cy="100" r="3" fill="currentColor"/>
      <path d="M105 76v12m0 24v12m-24-24h12m24 0h12" stroke="#A37E3E"/>
    </>}
  </svg>;
}
