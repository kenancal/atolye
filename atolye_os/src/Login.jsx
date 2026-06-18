import { useState } from 'react';
import './App.css';
import { supabase } from './lib/supabaseClient';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('E-posta ve şifre zorunludur.');
      return;
    }

    setBusy(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    });

    if (signInError) {
      setError(`Giriş başarısız: ${signInError.message}`);
    }

    setBusy(false);
  }

  return (
    <main className="authShell">
      <section className="authCard">
        <div className="authBrand">
          <div className="brandMark">A</div>
          <div>
            <p className="eyebrow">Kişisel girişim merkezi</p>
            <h1>Atölye</h1>
          </div>
        </div>

        <h2 className="authTitle">Giriş yap</h2>

        {error && <div className="errorBanner">{error}</div>}

        <form className="authForm" onSubmit={handleSubmit}>
          <label className="formField">
            <span>E-posta</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="ornek@eposta.com"
              autoComplete="email"
            />
          </label>

          <label className="formField">
            <span>Şifre</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <button className="primaryButton authSubmit" type="submit" disabled={busy}>
            {busy ? 'Lütfen bekle...' : 'Giriş yap'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default Login;
