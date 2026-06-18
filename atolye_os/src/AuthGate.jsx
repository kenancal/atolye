import { useEffect, useState } from 'react';
import './App.css';
import { supabase } from './lib/supabaseClient';
import App from './App.jsx';
import Login from './Login.jsx';

function AuthGate() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <main className="authShell">
        <section className="authCard">
          <p className="authInfo">Oturum kontrol ediliyor...</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return <Login />;
  }

  return <App />;
}

export default AuthGate;
