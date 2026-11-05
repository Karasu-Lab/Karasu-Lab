{
  description = "Karasu Lab web monorepo development environment";

  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";

  outputs =
    { nixpkgs, ... }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (
        pkgs:
        let
          githubPackagesToken = pkgs.writeShellScript "github-packages-token" ''
            exec ${pkgs.gh}/bin/gh auth token
          '';
          npmrcAuthFile = pkgs.writeText "npmrc-auth" ''
            //npm.pkg.github.com/:tokenHelper=${githubPackagesToken}
          '';
        in
        {
          default = pkgs.mkShell {
            packages = with pkgs; [
              nodejs_24
              node-gyp
              pnpm
              python3
              git
              gh
            ];
            env = {
              npm_config_manage_package_manager_versions = "false";
              PNPM_CONFIG_NPMRC_AUTH_FILE = "${npmrcAuthFile}";
            };
          };
        }
      );
    };
}
