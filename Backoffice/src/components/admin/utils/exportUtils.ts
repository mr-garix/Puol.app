/**
 * Utilitaires d'export pour le Dashboard PUOL
 */

export interface PendingAction {
  label: string;
  count: number;
  type: string;
}

export interface CityStats {
  name: string;
  properties: number;
  bookings: number;
}

/**
 * Exporte les actions en attente en CSV
 */
export function exportPendingActionsToCSV(actions: PendingAction[]): void {
  const headers = ['Action', 'Nombre', 'Type'];
  const rows = actions.map(action => [
    action.label,
    action.count.toString(),
    action.type
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadCSV(csvContent, `actions-en-attente-${getDateString()}.csv`);
}

/**
 * Exporte les top villes en CSV
 */
export function exportTopCitiesToCSV(cities: CityStats[]): void {
  const headers = ['Ville', 'Annonces', 'Réservations', 'Taux de conversion'];
  const rows = cities.map(city => [
    city.name,
    city.properties.toString(),
    city.bookings.toString(),
    `${((city.bookings / city.properties) * 100).toFixed(1)}%`
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadCSV(csvContent, `top-villes-${getDateString()}.csv`);
}

/**
 * Télécharge un fichier CSV
 */
function downloadCSV(content: string, filename: string): void {
  const BOM = '\uFEFF'; // UTF-8 BOM pour Excel
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Génère une string de date pour nommage fichier
 */
function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${year}${month}${day}-${hours}${minutes}`;
}

/**
 * Exporte les KPI en CSV (pour rapports)
 */
export interface KPIData {
  title: string;
  value: string;
  change: number;
}

export function exportKPIToCSV(kpis: KPIData[], dateRange: string): void {
  const headers = ['Indicateur', 'Valeur', 'Évolution (%)'];
  const rows = kpis.map(kpi => [
    kpi.title,
    kpi.value,
    `${kpi.change > 0 ? '+' : ''}${kpi.change}%`
  ]);

  const csvContent = [
    `Rapport PUOL - ${dateRange}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  downloadCSV(csvContent, `rapport-kpi-${getDateString()}.csv`);
}
