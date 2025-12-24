import { DollarSign, TrendingUp, TrendingDown, Banknote, Building2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';
import { REVENUE_COLORS, formatCurrency } from '../../../lib/revenueMetrics';
import { UNIFIED_PAYMENTS, UNIFIED_BOOKINGS, UNIFIED_CONTRACTS, UNIFIED_VISITS } from '../../../lib/mockDataUnified';

interface RevenueOverviewWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function RevenueOverviewWidget({ dateRange, isLoading }: RevenueOverviewWidgetProps) {
  const isComparing = dateRange.compareEnabled && dateRange.compareStartDate && dateRange.compareEndDate;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-gray-900">Vue d'ensemble des revenus</h2>
        <p className="text-sm text-gray-500 mt-1">GMV vs Chiffre d'affaires PUOL avec breakdown détaillé</p>
      </div>

      {/* GMV vs Revenue principale */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GMV Total */}
        <Card className={`${REVENUE_COLORS.gmv.border} border-2 bg-gradient-to-br ${REVENUE_COLORS.gmv.bgLight} to-white`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className={`w-5 h-5 ${REVENUE_COLORS.gmv.text}`} />
              GMV Total (30 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : (
              <>
                <p className={`text-5xl ${REVENUE_COLORS.gmv.text}`}>
                  {formatCurrency(UNIFIED_PAYMENTS.gmvTotal, true)}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="default" className="bg-green-600">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{UNIFIED_PAYMENTS.growth.gmv}%
                  </Badge>
                  <p className="text-sm text-gray-500">vs période précédente</p>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Valeur économique totale générée par PUOL
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* CA PUOL Total */}
        <Card className={`${REVENUE_COLORS.revenue.border} border-2 bg-gradient-to-br ${REVENUE_COLORS.revenue.bgLight} to-white`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className={`w-5 h-5 ${REVENUE_COLORS.revenue.text}`} />
              CA PUOL Total (30 jours)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-12 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : (
              <>
                <p className={`text-5xl ${REVENUE_COLORS.revenue.text}`}>
                  {formatCurrency(UNIFIED_PAYMENTS.revenueTotal, true)}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="default" className="bg-green-600">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{UNIFIED_PAYMENTS.growth.revenue}%
                  </Badge>
                  <p className="text-sm text-gray-500">vs période précédente</p>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  Ce que PUOL gagne réellement (Take rate: {UNIFIED_PAYMENTS.takeRate.toFixed(1)}%)
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown par source */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Meublés */}
        <Card className={REVENUE_COLORS.furnished.border}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className={`w-4 h-4 ${REVENUE_COLORS.furnished.text}`} />
              Logements meublés
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {/* GMV */}
                  <div>
                    <p className="text-xs text-gray-500">GMV (prix propriétaire)</p>
                    <p className={`text-2xl ${REVENUE_COLORS.gmv.text}`}>
                      {formatCurrency(UNIFIED_PAYMENTS.furnished.amount, true)}
                    </p>
                  </div>
                  {/* Commission */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Commission PUOL (10%)</p>
                    <p className={`text-2xl ${REVENUE_COLORS.revenue.text}`}>
                      {formatCurrency(UNIFIED_PAYMENTS.furnished.commission, true)}
                    </p>
                  </div>
                  {/* Stats */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {UNIFIED_BOOKINGS.total} réservations • 
                      Moy: {formatCurrency(UNIFIED_BOOKINGS.avgValue)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Non-meublés */}
        <Card className={REVENUE_COLORS.unfurnished.border}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className={`w-4 h-4 ${REVENUE_COLORS.unfurnished.text}`} />
              Logements non-meublés
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {/* Commission */}
                  <div>
                    <p className="text-xs text-gray-500">Commission PUOL (1 mois)</p>
                    <p className={`text-2xl ${REVENUE_COLORS.revenue.text}`}>
                      {formatCurrency(UNIFIED_PAYMENTS.unfurnished.commission, true)}
                    </p>
                  </div>
                  {/* GMV */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Contribution au GMV</p>
                    <p className={`text-2xl ${REVENUE_COLORS.gmv.text}`}>
                      {formatCurrency(UNIFIED_PAYMENTS.unfurnished.commission, true)}
                    </p>
                  </div>
                  {/* Stats */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {UNIFIED_CONTRACTS.total} contrats signés •
                      Loyer moy: {formatCurrency(UNIFIED_CONTRACTS.avgRent)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Visites */}
        <Card className="border-pink-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-pink-600" />
              Visites programmées
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {/* Revenue */}
                  <div>
                    <p className="text-xs text-gray-500">Revenue PUOL (100%)</p>
                    <p className={`text-2xl ${REVENUE_COLORS.revenue.text}`}>
                      {formatCurrency(UNIFIED_PAYMENTS.visits.revenue, true)}
                    </p>
                  </div>
                  {/* GMV */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">Contribution au GMV</p>
                    <p className={`text-2xl ${REVENUE_COLORS.gmv.text}`}>
                      {formatCurrency(UNIFIED_PAYMENTS.visits.revenue, true)}
                    </p>
                  </div>
                  {/* Stats */}
                  <div className="pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {UNIFIED_VISITS.total} visites • Frais: {formatCurrency(UNIFIED_VISITS.fee)}
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Info box */}
      <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-gray-700">
            <strong>💡 Modèle économique PUOL :</strong> Le GMV représente la valeur économique totale
            générée par la plateforme (ce que paient les utilisateurs + commissions). Le CA PUOL représente
            uniquement ce que PUOL gagne : 10% sur meublés, 1 mois de loyer sur non-meublés, et 5000 FCFA par visite.
            Le take rate actuel de {UNIFIED_PAYMENTS.takeRate.toFixed(1)}% est calculé comme CA PUOL / GMV.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
