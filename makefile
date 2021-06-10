bundle:
	esbuild --target=es2020,chrome89,firefox88,safari13 --minify --bundle --legal-comments=eof polyfill/polyfill.mjs > polyfill/polyfill.min.js