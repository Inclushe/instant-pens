# Instant Pens

Automatically compiles HTML/CSS/JS preprocessors and live reloads your page using Browsersync.

Use your editor of choice.

**NOTE: Currently in testing.**


## Installation

```shell
$ npm install -g instant-pens
$ pen add [preprocessor...] # Add your preprocessors/compilers of choice
```

### Preprocessors

Preprocessors only need to be added once to compile files when `pen` is run.

- [X] `pug` (Pug/Jade)
- [X] `stylus`
- [ ] HAML
- [ ] Handlebars
- [ ] SASS/SCSS
- [ ] Babel

## Examples

```shell
# compile in current directory
$ pen

# compile in different directory
$ pen [dir]

# compile or copy files from src/ directory to dist/ directory
$ pen --src --dist

# add preprocessors pug and stylus
$ pen add pug stylus

# remove preprocessor pug
$ pen remove pug

# create project folder with default preprocessor files
$ pen create ./new-project/

# set default preprocessor files to create when running `pen create`
pen default html stylus js
```

For more options, run `pen --help` or `pen [command] --help`.

## TODO:
- [ ] Enable HAML Support
- [ ] Enable Handlebars Support
- [ ] Enable SASS/SCSS Support
- [ ] Enable Babel Support