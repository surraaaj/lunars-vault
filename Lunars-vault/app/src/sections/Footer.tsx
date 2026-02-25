export function Footer() {
  const links = [
    { label: 'Product', href: '#' },
    { label: 'Docs', href: '#' },
    { label: 'Changelog', href: '#' },
    { label: 'Blog', href: '#' },
  ];

  return (
    <footer className="bg-muted/30 border-t border-border/40">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Navigation Links */}
          <nav className="flex flex-wrap justify-center gap-6">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Copyright */}
          <p className="text-xs text-muted-foreground">
            Built on{' '}
            <a
              href="https://quai.network"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground hover:underline"
            >
              Quai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
