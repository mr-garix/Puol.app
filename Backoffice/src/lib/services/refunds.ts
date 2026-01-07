import { supabase } from '../supabaseClient';

console.log('[refunds] Service initialized, supabase available:', !!supabase);

// Test de connectivité à la table refunds au démarrage
if (supabase) {
  (async () => {
    try {
      console.log('[refunds] Testing connection to refunds table...');
      const { error } = await (supabase as any)
        .from('refunds')
        .select('count', { count: 'exact', head: true });
      
      if (error) {
        console.error('[refunds] Test query failed:', {
          message: error.message,
          code: error.code,
          details: error.details,
        });
      } else {
        console.log('[refunds] Test query successful, table is accessible');
      }
    } catch (err) {
      console.error('[refunds] Test query exception:', err);
    }
  })();
}

export type RefundRecord = {
  id: string;
  bookingId: string;
  guestProfileId: string;
  refundAmount: number;
  originalAmount: number;
  refundReason: string;
  refundNotes?: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod?: string | null;
  paymentReference?: string | null;
  phoneNumber?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
};

export type RefundInput = {
  bookingId: string;
  guestProfileId: string;
  refundAmount: number;
  originalAmount: number;
  refundReason: string;
  refundNotes?: string | null;
  phoneNumber?: string | null;
  paymentMethod?: string | null;
};

export async function createRefund(input: RefundInput): Promise<RefundRecord | null> {
  if (!supabase) {
    console.warn('[refunds] Supabase client unavailable');
    return null;
  }

  try {
    console.log('[refunds] Creating refund with input:', {
      bookingId: input.bookingId,
      guestProfileId: input.guestProfileId,
      refundAmount: input.refundAmount,
      originalAmount: input.originalAmount,
      refundReason: input.refundReason,
      phoneNumber: input.phoneNumber,
    });

    const insertPayload = {
      booking_id: input.bookingId,
      guest_profile_id: input.guestProfileId,
      refund_amount: input.refundAmount,
      original_amount: input.originalAmount,
      refund_reason: input.refundReason,
      refund_notes: input.refundNotes ?? null,
      phone_number: input.phoneNumber ?? null,
      payment_method: input.paymentMethod ?? null,
      status: 'pending',
      requested_at: new Date().toISOString(),
    };

    console.log('[refunds] Insert payload:', insertPayload);

    const { data, error } = await (supabase as any)
      .from('refunds')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      console.error('[refunds] Error creating refund:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return null;
    }

    console.log('[refunds] Refund created successfully:', data?.id);
    console.log('[refunds] Refund data:', data);
    return mapRefundRowToRecord(data);
  } catch (error) {
    console.error('[refunds] Failed to create refund - Exception:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
}

export async function updateRefundStatus(
  refundId: string,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  paymentReference?: string
): Promise<RefundRecord | null> {
  if (!supabase) {
    console.warn('[refunds] Supabase client unavailable');
    return null;
  }

  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'processing') {
      updateData.processed_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (paymentReference) {
      updateData.payment_reference = paymentReference;
    }

    const { data, error } = await (supabase as any)
      .from('refunds')
      .update(updateData)
      .eq('id', refundId)
      .select()
      .single();

    if (error) {
      console.error('[refunds] Error updating refund status:', error);
      return null;
    }

    console.log('[refunds] Refund status updated:', refundId, status);
    return mapRefundRowToRecord(data);
  } catch (error) {
    console.error('[refunds] Failed to update refund status:', error);
    return null;
  }
}

export async function fetchRefunds(filters?: {
  bookingId?: string;
  guestProfileId?: string;
  status?: string;
}): Promise<RefundRecord[]> {
  if (!supabase) {
    console.warn('[refunds] Supabase client unavailable');
    return [];
  }

  try {
    console.log('[refunds] Fetching refunds with filters:', filters);
    
    // Utiliser directement le client Supabase sans dépendre des types générés
    const client = supabase as any;
    let query = client.from('refunds').select('*');

    if (filters?.bookingId) {
      console.log('[refunds] Filtering by bookingId:', filters.bookingId);
      query = query.eq('booking_id', filters.bookingId);
    }

    if (filters?.guestProfileId) {
      console.log('[refunds] Filtering by guestProfileId:', filters.guestProfileId);
      query = query.eq('guest_profile_id', filters.guestProfileId);
    }

    if (filters?.status) {
      console.log('[refunds] Filtering by status:', filters.status);
      query = query.eq('status', filters.status);
    }

    console.log('[refunds] Executing query...');
    const { data, error } = await query.order('requested_at', { ascending: false });

    if (error) {
      console.error('[refunds] Error fetching refunds:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      });
      return [];
    }

    console.log('[refunds] Refunds fetched successfully:', {
      count: data?.length || 0,
      firstRefund: data?.[0],
    });

    if (!data || data.length === 0) {
      console.log('[refunds] No refunds found in database');
      return [];
    }

    return data.map(mapRefundRowToRecord);
  } catch (error) {
    console.error('[refunds] Failed to fetch refunds - Exception:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
}

export async function fetchRefundsByBookingId(bookingId: string): Promise<RefundRecord[]> {
  return fetchRefunds({ bookingId });
}

function mapRefundRowToRecord(row: any): RefundRecord {
  return {
    id: row.id,
    bookingId: row.booking_id,
    guestProfileId: row.guest_profile_id,
    refundAmount: row.refund_amount,
    originalAmount: row.original_amount,
    refundReason: row.refund_reason,
    refundNotes: row.refund_notes ?? null,
    status: row.status,
    paymentMethod: row.payment_method ?? null,
    paymentReference: row.payment_reference ?? null,
    phoneNumber: row.phone_number ?? null,
    requestedAt: row.requested_at,
    processedAt: row.processed_at ?? null,
    completedAt: row.completed_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}
