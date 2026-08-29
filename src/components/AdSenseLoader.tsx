"use client";

import { useEffect, useState } from "react";

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

  if (!consented) return null;

  return (
    <script
      async
      src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4547647290394610"
      crossOrigin="anonymous"
    />
  );
}
