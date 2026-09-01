{
  description = "Local usage and behavior dashboard for Pi agent sessions";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" "x86_64-darwin" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in {
      nixosModules.default = { config, lib, pkgs, ... }:
        let
          cfg = config.programs.pi-stats-dashboard;
          piPackage = pkgs.runCommand "pi-stats-dashboard-package" {} ''
            mkdir -p $out/share/pi-stats-dashboard
            cp -r ${cfg.package}/. $out/share/pi-stats-dashboard/
          '';
        in {
          options.programs.pi-stats-dashboard = {
            enable = lib.mkEnableOption "the Pi stats dashboard package";
            package = lib.mkOption {
              type = lib.types.package;
              default = self.packages.${pkgs.system}.default;
              description = "Pi stats dashboard package to expose to Pi.";
            };
          };
          config = lib.mkIf cfg.enable {
            environment.systemPackages = [ piPackage ];
          };
        };

      packages = forAllSystems (pkgs: {
        default = pkgs.stdenvNoCC.mkDerivation {
          pname = "pi-stats-dashboard";
          version = "0.1.3";
          src = ./.;
          dontBuild = true;
          installPhase = ''
            mkdir -p $out
            cp -r extensions src artifacts README.md LICENSE package.json $out/
          '';
        };
      });
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = [ pkgs.nodejs_22 ];
        };
      });
    };
}
