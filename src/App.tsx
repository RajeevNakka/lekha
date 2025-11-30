import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './components/Dashboard/Dashboard';
import { TransactionList } from './components/Transactions/TransactionList';
import { CreateTransaction } from './components/Transactions/CreateTransaction';
import { EditTransaction } from './components/Transactions/EditTransaction';
import { TransactionHistory } from './components/Transactions/TransactionHistory';
import { BookSettings } from './components/Books/BookSettings';
import { Reports } from './components/Reports/Reports';
import { GlobalSettings } from './components/Settings/GlobalSettings';
import { AutoSync } from './components/AutoSync';

function App() {
  return (
    <>
      <AutoSync />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<TransactionList />} />
          <Route path="transactions/new" element={<CreateTransaction />} />
          <Route path="transactions/:transactionId/edit" element={<EditTransaction />} />
          <Route path="history" element={<TransactionHistory />} />
          <Route path="reports" element={<Reports />} />
          <Route path="books/:bookId/settings" element={<BookSettings />} />
          <Route path="settings" element={<GlobalSettings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
