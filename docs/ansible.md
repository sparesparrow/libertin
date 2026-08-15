# Ansible IaC — nasazení ze zdrojového textu

> Stav: **E10-T3 částečně hotovo** — kostra Ansible a role pro to, co dnes
> reálně existuje (webová vrstva). Nespuštěno proti skutečnému hostu.
> Požadavky smlouvy: **C11.2** (celý systém ze zdrojového textu), **C2**
> (maximum on-premise), **C3** (kontejnery), **C8** (předání externímu
> provozovateli).
> Co chybí, je vypsané na konci — nic z toho nepředstíráme jako hotové.

Soubory, které tento dokument popisuje:

| Soubor | Účel |
|---|---|
| `infra/ansible/ansible.cfg` | společné nastavení pro všechny operátory |
| `infra/ansible/requirements.yml` | Galaxy kolekce, na kterých role stojí |
| `infra/ansible/playbooks/site.yml` | vstupní bod — celé nasazení |
| `infra/ansible/inventories/example/` | vzorový inventář a `group_vars` |
| `infra/ansible/roles/common/` | základ hosta: čas, časová zóna, bezpečnostní aktualizace |
| `infra/ansible/roles/hardening/` | SSH, nftables, fail2ban, sysctl |
| `infra/ansible/roles/docker/` | Docker Engine + Compose plugin, daemon.json |
| `infra/ansible/roles/libertin_web/` | nasazení Compose stacku webu |
| `infra/ansible/.ansible-lint` | profil `production` + jedna doložená výjimka |

## Rychlý start

```bash
cd infra/ansible

# 1. kolekce (jednorázově)
ansible-galaxy collection install -r requirements.yml -p collections

# 2. vlastní inventář — vzorový NEUPRAVUJ, zkopíruj
cp -r inventories/example inventories/production
$EDITOR inventories/production/hosts.yml
$EDITOR inventories/production/group_vars/all.yml

# 3. suchý běh: co by se změnilo
ansible-playbook -i inventories/production/hosts.yml playbooks/site.yml --check --diff

# 4. ostrý běh
ansible-playbook -i inventories/production/hosts.yml playbooks/site.yml
```

Užitečné tagy: `--tags hardening` (jen bezpečnostní nastavení hosta),
`--tags web` (jen přenasazení aplikace), `--tags docker`.

## Co je ověřeno a co ne

Ověřeno reálným během nástrojů, ne odhadem:

| Kontrola | Výsledek |
|---|---|
| `ansible-playbook --syntax-check` | prošlo |
| `ansible-lint` (profil `production`, nejpřísnější) | 0 chyb, 0 varování, 23 souborů |
| Rendering šablon `nftables.conf.j2` a `env.j2` se `StrictUndefined` | prošlo, žádná nedefinovaná proměnná |

**Neověřeno:** playbook zatím **neběžel proti skutečnému hostu**. V tomto
prostředí není cílový stroj ani běžící Docker daemon, takže není ověřená
idempotence (druhý běh musí hlásit `changed=0`) ani to, že služby po nasazení
skutečně nastartují. Stejně jako u `.gitlab-ci.yml` to říkáme rovnou: bráno jako
**zkontrolované, ale neodzkoušené**. První běh patří na jednorázový testovací
stroj, ne na produkci, a jeho výstup se doplní sem.

Ve hře jsou dvě pojistky proti tomu, aby špatná změna odřízla přístup:
`validate:` u `sshd_config` (config, který sshd odmítne, se vůbec nenasadí)
a `validate:` u nftables (`nft --check`). Obě jsou levné a zabrání nejčastějšímu
způsobu, jak si operátor zamkne host.

## Proměnné

Všechny mají prefix `libertin_` a leží v `group_vars`. Kompletní seznam
s komentáři je v `inventories/example/group_vars/all.yml`; to podstatné:

| Proměnná | Default | Poznámka |
|---|---|---|
| `libertin_timezone` | `Europe/Prague` | ovlivňuje i TZ v kontejneru |
| `libertin_ssh_port` | `22` | firewall pravidlo se řídí touto hodnotou |
| `libertin_ssh_allowed_cidrs` | `0.0.0.0/0` | **před produkcí zúžit na VPN operátora** |
| `libertin_web_image` / `_tag` | `libertin/web` / `local` | v produkci pinovat digestem |
| `libertin_web_port` | `3000` | dnes jen na loopbacku, viz níže |
| `libertin_deploy_dir` | `/opt/libertin` | kde stack na hostu žije |

### Prefix proměnných — doložená výjimka z lintu

`ansible-lint` pravidlem `var-naming[no-role-prefix]` chce prefix podle role
(`docker_log_max_size`, `hardening_ssh_port`). Používáme jednotný projektový
prefix `libertin_` a je to rozhodnutí, ne přehlédnutí:

- Smyslem pravidla je zabránit kolizím mezi rolemi. `libertin_docker_log_max_size`
  koliduje s komunitní Docker rolí výrazně **méně** než `docker_log_max_size`.
- Prefix podle role by špatně pojmenoval sdílené proměnné. `libertin_timezone`
  čte `common` (nastavení hodin) i `libertin_web` (TZ do kontejneru) — pod tím
  pravidlem by musela existovat dvakrát pod dvěma jmény. `libertin_deploy_dir`
  je adresář celého stacku, ne jen webu; `libertin_web_deploy_dir` by bylo
  rovnou zavádějící, jakmile přibude role pro API a databázi.

Zdůvodnění je i v `infra/ansible/.ansible-lint`, aby ho našel i ten, kdo čte jen
konfiguraci. Revidovat, až se některá role bude vytahovat k použití mimo projekt.

## Tajemství

**Do repozitáře nepatří žádné tajemství — je veřejný.** Dnes role renderují jen
nesenzitivní konfiguraci. Jakmile přibude backend (D-003) a s ním hesla k
databázi, klíče k objektovému úložišti a SMTP přihlášení, platí:

- hodnoty jdou přes **Ansible Vault** (`ansible-vault encrypt_string`) nebo
  externí secret store, nikdy přes `group_vars` v gitu;
- `.env` na hostu má mód `0640` a vlastní ho uživatel `libertin`;
- vault heslo se nepředává v příkazové řádce (zůstalo by v shell historii), ale
  přes `--vault-password-file` mimo repozitář.

Skutečný inventář **nepatří do veřejného repozitáře**: jména a adresy strojů
téhle platformy jsou sama o sobě citlivá (C2, diskrétnost jako feature). Proto je
komitnutý jen `inventories/example/` s adresami z TEST-NET-1.

## Co zatím nenasazujeme

Nic z následujícího tento task neřeší a **nepředstírá, že je hotové**. Skupiny
jsou už deklarované v inventáři a v `site.yml`, aby bylo vidět tvar a nikdo si
nevymyslel jiný:

| Chybí | Kde se to dělá |
|---|---|
| `api` — backend | E9-T3 (blokováno D-003) |
| `database` — PostgreSQL + šifrování at-rest | E9-T2, E9-T6 (blokováno D-003) |
| `cache` — Redis | E9-T5 |
| `storage` — S3-kompatibilní úložiště | E9-T4 |
| `mail` — SMTP s platnými certifikáty | E5-T2 |
| `proxy` — reverzní proxy, TLS terminace, load balancer | E10-T4 |
| `backup` — zálohovací agent mimo host | E10-T5 |
| Provisioning samotných strojů (VM, disky, sítě) | blokováno D-004 |
| Ověření idempotence a předatelnosti reálným během | E12-T5 |

Dvě věci, které je potřeba mít na paměti dřív, než se web pustí k veřejnosti:

1. **Veřejný port se v nftables záměrně neotevírá.** Dokud neexistuje reverzní
   proxy s TLS (E10-T4), web poslouchá jen na loopbacku. Otevřít 80/443 teď by
   znamenalo servírovat provoz členů v plaintextu — a HSTS hlavičku, kterou
   aplikace posílá, prohlížeč přes `http://` ignoruje.
2. **Uživatel `libertin` je ve skupině `docker`.** To je na daném hostu
   ekvivalent roota; proto nemá interaktivní shell (`/usr/sbin/nologin`) a
   neslouží k ničemu jinému než k běhu stacku. Až role poroste, stojí za zvážení
   rootless Docker nebo Podman.

## Předání externímu provozovateli (C8)

Co musí být hotové, než se tohle dá předat:

- [ ] první ostrý běh proti testovacímu stroji + doplnit výstup do tohoto dokumentu
- [ ] ověřená idempotence (druhý běh `changed=0`)
- [ ] verze kolekcí v `requirements.yml` pinované přesně (`==`), ne jako floor
- [ ] base image i balíčky pinované digestem/verzí kvůli reprodukovatelnosti
- [ ] postup obnovy ze zálohy odzkoušený, ne jen popsaný (E10-T5)
- [ ] runbook pro běžné operace: restart, rollback, rotace certifikátů, rotace klíčů
