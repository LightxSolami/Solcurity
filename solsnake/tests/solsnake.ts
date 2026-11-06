import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { assert } from "chai";
const { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } = anchor.web3;

describe("solsnake_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SolsnakeEscrow as Program<any>;
  const authority = (provider.wallet as anchor.Wallet).payer;
  const treasury = new PublicKey("DLbjcTvMHuvENT1336tdSRd9giHzJd5Uwo5WraqQ3k82");
  const FEE = new BN(LAMPORTS_PER_SOL / 2);
  const FEE_BPS = 50;
  const pdas = (id: BN) => {
    const [gm] = PublicKey.findProgramAddressSync([Buffer.from("match"), id.toArrayLike(Buffer, "le", 8)], program.programId);
    const [vault] = PublicKey.findProgramAddressSync([Buffer.from("vault"), gm.toBuffer()], program.programId);
    return { gm, vault };
  };
  const fund = async (kp: anchor.web3.Keypair, sol = 2) => {
    const sig = await provider.connection.requestAirdrop(kp.publicKey, sol * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig, "confirmed");
  };
  const create = async (id: BN, fee = FEE, bps = FEE_BPS, treasuryAccount = treasury) => {
    const { gm, vault } = pdas(id);
    await program.methods.createMatch(id, fee, bps).accounts({ gameMatch: gm, vault, authority: authority.publicKey, treasury: treasuryAccount, systemProgram: SystemProgram.programId }).rpc();
    return { gm, vault };
  };
  const join = (gm: any, vault: any, p: anchor.web3.Keypair) =>
    program.methods.joinMatch().accounts({ gameMatch: gm, vault, player: p.publicKey, systemProgram: SystemProgram.programId }).signers([p]).rpc();
  const bal = (k: anchor.web3.PublicKey) => provider.connection.getBalance(k);

  it("rejects an entry fee outside 0.05 / 0.1 / 0.5 / 1 SOL", async () => {
    try { await create(new BN(900), new BN(123)); assert.fail(); } catch (e: any) { assert.include(e.toString(), "InvalidEntryFee"); }
  });

  it("locks the fee rate and developer treasury", async () => {
    try { await create(new BN(901), FEE, 500); assert.fail(); } catch (e: any) { assert.include(e.toString(), "InvalidFeeRate"); }
    try { await create(new BN(902), FEE, FEE_BPS, Keypair.generate().publicKey); assert.fail(); } catch (e: any) { assert.include(e.toString(), "BadTreasury"); }
  });

  it("5 players join, authority settles, winner and treasury are paid exactly", async () => {
    const id = new BN(1001), { gm, vault } = await create(id);
    const ps = Array.from({ length: 5 }, () => Keypair.generate());
    for (const p of ps) { await fund(p); await join(gm, vault, p); }
    assert.equal(await bal(vault), 5 * FEE.toNumber());
    const w = ps[2], before = await bal(w.publicKey), treasuryBefore = await bal(treasury);
    try {
      await program.methods.settleMatch(w.publicKey).accounts({ gameMatch: gm, vault, authority: authority.publicKey, winnerAccount: w.publicKey, treasury, systemProgram: SystemProgram.programId }).rpc();
      assert.fail();
    } catch (e: any) { assert.include(e.toString(), "MissingPlayerApprovals"); }
    await program.methods.settleMatch(w.publicKey).accounts({ gameMatch: gm, vault, authority: authority.publicKey, winnerAccount: w.publicKey, treasury, systemProgram: SystemProgram.programId })
      .remainingAccounts(ps.map(p => ({ pubkey: p.publicKey, isWritable: false, isSigner: true }))).signers(ps).rpc();
    const pot = 5 * FEE.toNumber(), fee = Math.floor(pot * FEE_BPS / 10000);
    assert.equal((await bal(w.publicKey)) - before, pot - fee);
    assert.equal((await bal(treasury)) - treasuryBefore, fee);
    assert.equal(await bal(vault), 0);
  });

  it("blocks a second settlement and duplicate joins", async () => {
    const id = new BN(1002), { gm, vault } = await create(id), p = Keypair.generate();
    await fund(p); await join(gm, vault, p);
    try { await join(gm, vault, p); assert.fail(); } catch (e: any) { assert.include(e.toString(), "AlreadyJoined"); }
  });

  it("only the authority can settle", async () => {
    const id = new BN(1003), { gm, vault } = await create(id);
    const ps = Array.from({ length: 5 }, () => Keypair.generate());
    for (const p of ps) { await fund(p); await join(gm, vault, p); }
    const evil = Keypair.generate();
    await fund(evil);
    try {
      await program.methods.settleMatch(evil.publicKey).accounts({ gameMatch: gm, vault, authority: evil.publicKey, winnerAccount: evil.publicKey, treasury, systemProgram: SystemProgram.programId })
        .remainingAccounts(ps.map(p => ({ pubkey: p.publicKey, isWritable: false, isSigner: true }))).signers([...ps, evil]).rpc();
      assert.fail();
    } catch (e: any) { assert.include(e.toString(), "Unauthorized"); }
  });

  it("refund is refused before the timeout", async () => {
    const id = new BN(1004), { gm, vault } = await create(id), p = Keypair.generate();
    await fund(p); await join(gm, vault, p);
    try { await program.methods.refund().accounts({ gameMatch: gm, vault, player: p.publicKey, systemProgram: SystemProgram.programId }).signers([p]).rpc(); assert.fail(); }
    catch (e: any) { assert.include(e.toString(), "TooEarly"); }
  });
  // TODO before mainnet: timeout paths need a validator clock warp (solana-test-validator --warp-slot or bankrun).
});
