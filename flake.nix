{
  description = "GARKATRON portfolio — Astro 5 + React 19 + Tailwind v4";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in
    {
      devShells = forAllSystems (
        system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_22
              pnpm
              git
            ];

            shellHook = ''
              echo "GARKATRON dev shell — node $(node --version), pnpm $(pnpm --version)"
              echo "  pnpm install   # install dependencies"
              echo "  pnpm dev       # http://localhost:4321"
              echo "  pnpm build     # astro build + pagefind index"
            '';
          };
        }
      );

      formatter = forAllSystems (system: nixpkgs.legacyPackages.${system}.nixfmt-rfc-style);
    };
}
