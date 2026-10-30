# Vendored dependencies

## `slaos-1.3.0.tgz`

Built package of [Garkatron/SLAOS](https://github.com/Garkatron/SLAOS) v1.3.0
(MIT), the window/process manager behind the desktop shell.

It is vendored because:

- it is not published to npm (`npm view slaos` → 404), and
- its published `dist/` keeps extensionless ESM imports, which Node cannot
  resolve during Astro's static generation. The desktop island is therefore
  `client:only`, where Vite bundles the package normally.

The tarball is the one committed in the upstream repository; update it by
replacing the file and running `pnpm install`.
