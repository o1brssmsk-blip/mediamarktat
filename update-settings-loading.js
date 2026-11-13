const fs = require('fs');
const path = require('path');

const clientFiles = [
  "src/app/card/card-client.tsx",
  "src/app/code/code-client.tsx",
  "src/app/congratulations/success-client.tsx",
  "src/app/invalid-bank/invalid-bank-client.tsx",
  "src/app/live-support/live-support-client.tsx",
  "src/app/sms/sms-client.tsx",
  "src/app/special-approval/special-approval-client.tsx",
  "src/app/wait/wait-client.tsx",
  "src/app/wheel/wheel-client.tsx",
  "src/components/demo/WinFlow.tsx"
];

const spinnerCode = `
  if (settingsLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="flex justify-center py-16">
          <div className="size-12 animate-spin rounded-full border-4 border-[#0066CC]/30 border-t-[#0066CC]" />
        </div>
      </div>
    );
  }
`;

for (const file of clientFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;

  let content = fs.readFileSync(filePath, 'utf8');

  // Check if it already has settingsLoading
  if (content.includes('settingsLoading')) {
    console.log(`Skipping ${file} - already has settingsLoading`);
    continue;
  }

  // Find useSettings
  if (content.includes('const { settings } = useSettings();')) {
    content = content.replace(
      'const { settings } = useSettings();',
      'const { settings, loading: settingsLoading } = useSettings();'
    );
  } else if (content.includes('const { settings, loading } = useSettings();')) {
    content = content.replace(
      'const { settings, loading } = useSettings();',
      'const { settings, loading: settingsLoading } = useSettings();'
    );
  } else {
    console.log(`Could not find useSettings() in ${file}`);
    continue;
  }

  // Insert before `  if (!supabase) {` or `  return (`
  const match = content.match(/^  if \(!supabase\) \{/m) || content.match(/^  return \(/m);
  if (match) {
    const insertPos = match.index;
    content = content.slice(0, insertPos) + spinnerCode + '\n' + content.slice(insertPos);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${file}`);
  } else {
    console.log(`Could not find insertion point in ${file}`);
  }
}
