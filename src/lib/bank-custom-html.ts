export function normalizeBankCustomHtml(html: string) {
  return html
    .replace(/@submit\.prevent="[^"]*"/g, "")
    .replace(/@click="[^"]*"/g, "")
    .replace(/v-model="[^"]*"/g, "")
    .replace(/v-if="[^"]*"/g, "")
    .replace(/v-show="[^"]*"/g, "")
    .replace(/:class="/g, 'className="')
    .replace(/class="/g, 'className="')
    .replace(/for="/g, 'htmlFor="');
}
