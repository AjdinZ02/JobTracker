import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register } from '../services/auth';
import { showError, showSuccess } from '../utils/toast';

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!form.email || !form.password || !form.firstName || !form.lastName) {
        showError('Sva polja su obavezna!');
        return;
      }

      if (form.password.length < 6) {
        showError('Lozinka mora biti najmanje 6 karaktera!');
        return;
      }

      await register(form.email, form.password, form.firstName, form.lastName);
      showSuccess('Registracija uspješna! Preusmjeravam...');
      setTimeout(() => navigate('/'), 1500);
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Greška pri registraciji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Registracija</h2>
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
            type="text"
            name="firstName"
            placeholder="Ime"
            value={form.firstName}
            onChange={handleChange}
            disabled={loading}
          />
          <input
            type="text"
            name="lastName"
            placeholder="Prezime"
            value={form.lastName}
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
            {loading ? 'Registracija...' : 'Registruj se'}
          </button>
        </form>
        <p>
          Već imaš račun? <a href="/login">Prijavi se</a>
        </p>
      </div>
    </div>
  );
}
