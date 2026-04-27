'use client';

import { useAuth } from '@/components/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

export function PendingApprovalScreen() {
  const { signOut } = useAuth();

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card className="max-w-md w-full text-center shadow-lg">
        <CardContent className="py-10 space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-amber-100 p-4">
              <Clock className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-stone-900">Account Pending Approval</h2>
          <p className="text-stone-600 text-sm leading-relaxed">
            Your account is awaiting approval from a church administrator. You will gain access to
            member features once your account has been approved.
          </p>
          <p className="text-stone-500 text-xs">
            If you believe this is a mistake, please contact the church office.
          </p>
          <Button variant="outline" className="mt-2" onClick={() => signOut()}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
