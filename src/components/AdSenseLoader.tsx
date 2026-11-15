"use client";

import { useEffect, useState } from "react";

// Loading the AdSense script before the site is approved can hurt the review,
// so it is switched off. After AdSense approves mouxti.com, set this to true to
// re-enable loading the script once a visitor accepts cookies.
const ADSENSE_APPROVED = false;

export default function AdSenseLoader() {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    function check() {
      setConsented(localStorage.getItem("cookie-consent") === "accepted");
    }
    check();
    window.addEventListener("storage", check);
    return () => window.removeEventListener("storage", check);
  }, []);

  if (!ADSENSE_APPROVED || !consented) return null;

  return (
    <script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4547647290394610"
      crossOrigin="anonymous"
    />
  );
}
