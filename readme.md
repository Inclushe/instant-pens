# Instant Pens

Automatically compiles HTML/CSS/JS preprocessors and live reloads your page using Browsersync.

Use your editor of choice.

It just works(tm).

```bash
npm install -g instant-pens # globally install instant-pens
pen add pug stylus # install your preprocessors/compilers of choice
pen create ./new-project/
[Instant Pens] Using default preprocessors: pug, stylus [change using 'pen default']
cd new-project/
pen

pen # Runs Browsersync live reloading and chokidar in current folder
pen [directory] # Runs Browsersync live reloading and chokidar in directory
# Flags
pen -p --port
pen -u --ui-port
pen -c --config
pen --bs-config
pen add
pen add -n --no-default
pen create
pen default

```