import { ConnectForm } from '@/components/legacy/ConnectForm';
import { Card, CardContent } from '@/components/ui/Card';

export default function ConnectPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Connect to Node</h1>
      <Card>
        <CardContent className="py-6">
          <ConnectForm />
        </CardContent>
      </Card>
    </div>
  );
}
