# SOLSNAKE ARENA

Battle arena de serpents pour 5 joueurs, avec serveur autoritaire, musique/effets générés en direct et un programme Solana d'escrow (0,5 / 1 / 10 SOL).

## État réel du projet
| Partie | État |
|---|---|
| `programs/solsnake_escrow` (Rust/Anchor 0.30) | **Compile** (`cargo check`) et **4 tests unitaires Rust passent** (`cargo test`) : disposition mémoire du compte, discriminateurs, calcul de commission. **Pas encore compilé en SBF ni déployé** (outil `anchor build` absent de mon environnement). Non audité |
| `tests/solsnake.ts` | Tests d'intégration Anchor écrits, **jamais exécutés** (il faut un validateur Solana) |
| `server/chain.js` | Client web3.js brut (create/settle/lecture). Parseur et discriminateurs **testés** (`npm test`). Appels réseau **jamais exécutés** sur un cluster |
| `server/index.js` | Matchmaking gratuit **testé en local**. Flux payant (création du match, attente des 5 dépôts, règlement) **câblé mais jamais exécuté** |
| `client/online.html` | Connexion wallet, écran de confirmation du dépôt, `join_match`, `refund` : **câblés, jamais testés dans un navigateur avec un wallet** |
| `client/practice.html` | Solo hors ligne vs bots |
| Salles payantes | **Verrouillées** par défaut (`PAID_ENABLED=false`) |

## Lancer le jeu en ligne (gratuit)
```bash
cd server && npm install && npm start
# ouvrir http://localhost:8080 (plusieurs onglets = plusieurs joueurs)
```
Pour jouer à plusieurs sur Internet, déployez `server/` sur un hébergeur Node avec WebSocket (Fly.io, Railway, Render, VPS) derrière HTTPS (les navigateurs exigent `wss://`).

## Activer les salles payantes sur Devnet (jamais sur mainnet sans audit)
1. Déployer le programme (section suivante) et noter l'ID.
2. `solana-keygen new -o server-keypair.json`, puis `solana airdrop 2 <pubkey> --url devnet`.
3. Renseigner `.env` (voir `.env.example`) avec `PAID_ENABLED=true`, `PROGRAM_ID`, `TREASURY_PUBKEY`, `SERVER_KEYPAIR`.
4. `cd server && npm start`. Chaque joueur connecte Phantom/Solflare/Backpack (réseau Devnet), choisit 0.5 / 1 / 10 SOL.
Flux : 5 joueurs en file → le serveur crée le match on-chain → chaque joueur voit un écran de confirmation (montant, réseau, comptes) puis approuve dans son wallet → le serveur vérifie les 5 dépôts on-chain (90 s max) → partie sans bots → le gagnant est payé par `settle_match`. Dépôts incomplets : le bouton « Reclaim stake » appelle `refund` (possible 1 h après la création).

## Programme Anchor sur Devnet
Prérequis : Rust, Solana CLI, Anchor 0.30.x, Node 18+, yarn.
```bash
yarn install
solana config set --url devnet && solana-keygen new      # si pas de clé
solana airdrop 2
anchor build
anchor keys sync          # remplace l'ID provisoire dans lib.rs et Anchor.toml
anchor build
anchor test               # validateur local
anchor deploy --provider.cluster devnet
```
Vérification rapide sans Solana : `cargo test -p solsnake_escrow` (Rust ≥ 1.80 recommandé).

## Fonctionnement de l'escrow
1. Le serveur (authority) appelle `create_match(id, entry_fee, fee_bps)` : frais limités à 0,5 / 1 / 10 SOL, commission max 10 %.
2. Chaque joueur signe `join_match` : son dépôt va dans le PDA `vault`. Doublons et sixième joueur refusés.
3. Le serveur calcule le gagnant et appelle `settle_match(winner)` : gagnant payé (pot − commission), trésorerie payée, statut `Settled` (pas de double règlement).
4. Si le serveur ne règle pas dans l'heure, chaque joueur appelle `refund` pour récupérer sa mise.
Montants en arithmétique vérifiée (`checked_*`, u128).

## Limites à connaître avant d'activer de l'argent réel
- Égalité (deux têtes qui se percutent) : le dernier traité par le serveur est déclaré gagnant. À remplacer par une règle de partage avant tout usage réel.
- Le serveur reste de confiance : il désigne seul le gagnant. Un serveur compromis peut désigner un faux gagnant. Protégez sa clé (HSM/multisig), journalisez les matchs.
- Les parties vs bots avec mises ne doivent pas exister : réservez les salles payantes à 5 humains.
- Audit de sécurité indépendant du programme obligatoire avant le mainnet.
- Jeux d'argent / concours avec mise : réglementés selon les pays (licence, âge, KYC). Faites une revue juridique avant d'activer `PAID_ENABLED`.
- Tests de timeout (`refund` après 1 h) à ajouter avec `solana-bankrun`.
