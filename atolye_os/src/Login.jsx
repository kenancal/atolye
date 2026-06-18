import { useState } from 'react';
import './App.css';
import { supabase } from './lib/supabaseClient';

function Login() {
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setInfo('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('E-posta ve şifre zorunludur.');
      return;
    }

    setBusy(true);

    if (mode === 'signin') {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (signInError) {
        setError(`Giriş başarısız: ${signInError.message}`);
      }

      setBusy(false);
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
    });

    if (signUpError) {
      setError(`Kayıt başarısız: ${signUpError.message}`);
      setBusy(false);
      return;
    }

    if (!data.session) {
      setInfo('Hesap oluşturuldu. E-posta doğrulaması açıksa gelen kutunu kontrol et, sonra giriş yap.');
      setMode('signin');
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
            <h1>Atölye OS</h1>
          </div>
        </div>

        <h2 className="authTitle">{mode === 'signin' ? 'Giriş yap' : 'Hesap oluştur'}</h2>

        {error && <div className="errorBanner">{error}</div>}
        {info && <div className="authInfo">{info}</div>}

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
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </label>

          <button className="primaryButton authSubmit" type="submit" disabled={busy}>
            {busy ? 'Lütfen bekle...' : mode === 'signin' ? 'Giriş yap' : 'Kayıt ol'}
          </button>
        </form>

        <button
          className="authToggle"
          type="button"
          onClick={() => {
            setMode((current) => (current === 'signin' ? 'signup' : 'signin'));
            setError('');
            setInfo('');
          }}
        >
          {mode === 'signin' ? 'Hesabın yok mu? Kayıt ol' : 'Zaten hesabın var mı? Giriş yap'}
        </button>
      </section>
    </main>
  );
}

export default Login;
