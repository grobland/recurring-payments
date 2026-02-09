import { TransactionBrowser } from "@/components/transactions";

export default function TransactionsPage() {
  return (
    <div className="container mx-auto py-6 h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold mb-6">Transactions</h1>
      <TransactionBrowser />
    </div>
  );
}
