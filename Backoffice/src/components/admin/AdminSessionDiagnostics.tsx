import { useState } from 'react';
import { diagnoseAdminSession, checkRLSPermissions } from '@/lib/adminDiagnostics';

export function AdminSessionDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRunDiagnostics = async () => {
    setIsLoading(true);
    try {
      const result = await diagnoseAdminSession();
      const rlsResult = await checkRLSPermissions();
      setDiagnostics({
        session: result,
        rls: rlsResult,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      setDiagnostics({
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">Session Admin - Diagnostic</h2>
      
      <button
        onClick={handleRunDiagnostics}
        disabled={isLoading}
        className="px-4 py-2 bg-[#2ECC71] text-white rounded-lg hover:bg-[#27AE60] disabled:opacity-50"
      >
        {isLoading ? 'Vérification en cours...' : 'Vérifier la session'}
      </button>

      {diagnostics && (
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-2">Session Supabase</h3>
            {diagnostics.session?.error ? (
              <div className="text-red-600">
                <p className="font-semibold">❌ Erreur</p>
                <p className="text-sm">{diagnostics.session.error}</p>
              </div>
            ) : diagnostics.session?.isValid ? (
              <div className="text-green-600">
                <p className="font-semibold">✅ Session valide</p>
                <div className="text-sm mt-2 space-y-1">
                  <p><strong>Profil:</strong> {diagnostics.session.adminProfile?.first_name} {diagnostics.session.adminProfile?.last_name}</p>
                  <p><strong>Téléphone:</strong> {diagnostics.session.adminProfile?.phone}</p>
                  <p><strong>Rôle:</strong> {diagnostics.session.adminProfile?.role}</p>
                  <p><strong>Expire:</strong> {new Date(diagnostics.session.supabaseSession?.expires_at * 1000).toLocaleString()}</p>
                </div>
              </div>
            ) : (
              <div className="text-yellow-600">
                <p className="font-semibold">⚠️ Session invalide</p>
                <p className="text-sm">{diagnostics.session?.error || 'Raison inconnue'}</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-2">Permissions RLS</h3>
            {diagnostics.rls?.error ? (
              <div className="text-red-600">
                <p className="font-semibold">❌ Erreur</p>
                <p className="text-sm">{diagnostics.rls.error}</p>
              </div>
            ) : diagnostics.rls?.canReadBookings ? (
              <div className="text-green-600">
                <p className="font-semibold">✅ Permissions OK</p>
                <p className="text-sm">Réservations accessibles: {diagnostics.rls.bookingsCount}</p>
              </div>
            ) : (
              <div className="text-red-600">
                <p className="font-semibold">❌ Permissions insuffisantes</p>
                <p className="text-sm">{diagnostics.rls?.bookingsError || 'Erreur inconnue'}</p>
              </div>
            )}
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="font-semibold mb-2">Informations</h3>
            <p className="text-sm text-gray-600">Diagnostic effectué: {new Date(diagnostics.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
