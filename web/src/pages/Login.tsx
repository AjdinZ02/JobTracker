import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';
import { showError, showSuccess } from '../utils/toast';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!form.email || !form.password) {
        showError('Email i lozinka su obavezni!');
        return;
      }

      await login(form.email, form.password);
      showSuccess('Prijava uspješna! Preusmjeravam...');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Greška pri prijavi');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    try {
      await login('demo@example.com', 'demo123');
      showSuccess('Demo prijava uspješna!');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Greška pri demo prijavi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Prijava</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            disabled={loading}
          />
          <input
            type="password"
            name="password"
            placeholder="Lozinka"
            value={form.password}
            onChange={handleChange}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Prijava...' : 'Prijavi se'}
          </button>
        </form>
        <button className="demo-btn" onClick={handleDemoLogin} disabled={loading}>
          Demo račun (demo@example.com / demo123)
        </button>
        <p>
          Nemaš račun? <a href="/register">Registruj se</a>
        </p>
      </div>
    </div>
  );
}
