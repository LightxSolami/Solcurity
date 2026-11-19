import anchor from "@coral-xyz/anchor";
import type { Program } from "@coral-xyz/anchor";
import type { SolsnakeEscrow } from "../target/types/solsnake_escrow";
import { assert } from "chai";
import crypto from "crypto";

const { Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram } = anchor.web3;
const BN = anchor.BN;
type BN = InstanceType<typeof BN>;

function assertProgramError(error: unknown, code: string) {
  const actualCode = (
    error as { error?: { errorCode?: { code?: string } } }
  )?.error?.errorCode?.code;
  assert.equal(actualCode, code);
}

describe("solsnake_escrow", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.SolsnakeEscrow as Program<SolsnakeEscrow>;
  const authority = (provider.wallet as anchor.Wallet).payer;
  const treasury = new PublicKey("DLbjcTvMHuvENT1336tdSRd9giHzJd5Uwo5WraqQ3k82");
  const FEE = new BN(10 * LAMPORTS_PER_SOL);
  const FEE_BPS = 50;
  const pdas = (id: BN) => {
    const [gm] = PublicKey.findProgramAddressSync(
      [Buffer.from("match"), id.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [vault] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), gm.toBuffer()],
      program.programId
    );
    return { gm, vault };
  };
  const fund = async (kp: anchor.web3.Keypair, sol = 2) => {
    const tx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: authority.publicKey,
        toPubkey: kp.publicKey,
        lamports: sol * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx);
  };
  const create = async (
    id: BN,
    fee = FEE,
    bps = FEE_BPS,
    treasuryAccount = treasury
  ) => {
    const { gm, vault } = pdas(id);
    await program.methods.createMatch(id, fee, bps).accountsPartial({
      gameMatch: gm,
      vault,
      authority: authority.publicKey,
      treasury: treasuryAccount,
      systemProgram: SystemProgram.programId,
    }).rpc();
    return { gm, vault };
  };
  const join = (gm: anchor.web3.PublicKey, vault: anchor.web3.PublicKey, player: anchor.web3.Keypair) =>
    program.methods.joinMatch().accountsPartial({
      gameMatch: gm,
      vault,
      player: player.publicKey,
      systemProgram: SystemProgram.programId,
    }).signers([player]).rpc();
  const commitment = (
    id: BN,
    round: number,
    player: anchor.web3.PublicKey,
    direction: number,
    salt: Buffer,
  ) => {
    const matchId = Buffer.alloc(8);
    matchId.writeBigUInt64LE(BigInt(id.toString()));
    const roundBytes = Buffer.alloc(2);
    roundBytes.writeUInt16LE(round);
    return [...crypto.createHash("sha256").update(Buffer.concat([
      Buffer.from("solsnake-move-v1"),
      matchId,
      roundBytes,
      player.toBuffer(),
      Buffer.from([direction]),
      salt,
    ])).digest()];
  };
  const commitMove = (
    gm: anchor.web3.PublicKey,
    players: anchor.web3.Keypair[],
    playerIndex: number,
    value: number[],
  ) => program.methods.commitMove(value).accountsPartial({
    gameMatch: gm,
    player: players[playerIndex].publicKey,
  }).signers([players[playerIndex]]).rpc();
  const revealMove = (
    gm: anchor.web3.PublicKey,
    vault: anchor.web3.PublicKey,
    players: anchor.web3.Keypair[],
    playerIndex: number,
    direction: number,
    salt: Buffer,
  ) => program.methods.revealMove(direction, [...salt]).accountsPartial({
    gameMatch: gm,
    vault,
    player: players[playerIndex].publicKey,
    treasury,
    systemProgram: SystemProgram.programId,
  }).remainingAccounts(players.map(player => ({
    pubkey: player.publicKey,
    isWritable: true,
    isSigner: false,
  }))).signers([players[playerIndex]]).rpc();

  it("rejects entry fees outside the configured tiers", async () => {
    try {
      await create(new BN(Date.now()), new BN(123));
      assert.fail();
    } catch (error: unknown) {
      assertProgramError(error, "InvalidEntryFee");
    }
  });

  it("locks the fee rate and developer treasury", async () => {
    try {
      await create(new BN(Date.now() + 1), FEE, 500);
      assert.fail();
    } catch (error: unknown) {
      assertProgramError(error, "InvalidFeeRate");
    }
    try {
      await create(new BN(Date.now() + 2), FEE, FEE_BPS, Keypair.generate().publicKey);
      assert.fail();
    } catch (error: unknown) {
      assertProgramError(error, "BadTreasury");
    }
  });

  it("settles a five-player 10 SOL match with the exact 0.5% developer fee", async () => {
    const id = new BN(Date.now() + 3);
    const { gm, vault } = await create(id);
    const players = Array.from({ length: 5 }, () => Keypair.generate());
    for (const player of players) {
      await fund(player, 12);
      await join(gm, vault, player);
    }

    const before = await provider.connection.getBalance(vault);
    assert.equal(before, 5 * FEE.toNumber());
    const initial = await program.account.gameMatch.fetch(gm);
    assert.equal(initial.count, 5);
    assert.equal(initial.round, 0);
    assert.deepEqual(initial.status, { open: {} });

    const directions = [0, 1, 2, 3, 0];
    let finalRevealSignature: string | undefined;
    let treasuryBefore = 0;
    let winnerBefore = 0;
    for (let round = 0; round < 5; round++) {
      const salts = players.map((_, index) => Buffer.alloc(32, index + round + 1));
      const hashes = players.map((player, index) =>
        commitment(id, round, player.publicKey, directions[index], salts[index])
      );
      for (let index = 0; index < players.length; index++) {
        await commitMove(gm, players, index, hashes[index]);
        if (round === 0 && index === 0) {
          try {
            await commitMove(gm, players, 0, hashes[0]);
            assert.fail();
          } catch (error: unknown) {
            assertProgramError(error, "MoveAlreadyCommitted");
          }
          try {
            await revealMove(gm, vault, players, 0, directions[0], salts[0]);
            assert.fail();
          } catch (error: unknown) {
            assertProgramError(error, "RevealNotStarted");
          }
        }
      }
      if (round === 0) {
        try {
          await revealMove(gm, vault, players, 0, 1, salts[0]);
          assert.fail();
        } catch (error: unknown) {
          assertProgramError(error, "InvalidReveal");
        }
      }
      if (round === 4) {
        treasuryBefore = await provider.connection.getBalance(treasury);
        winnerBefore = await provider.connection.getBalance(players[4].publicKey);
      }
      for (let index = 0; index < players.length; index++) {
        const signature = await revealMove(gm, vault, players, index, directions[index], salts[index]);
        if (round === 4 && index === players.length - 1) finalRevealSignature = signature;
      }
    }

    const resolved = await program.account.gameMatch.fetch(gm);
    assert.equal(resolved.round, 4);
    assert.equal(resolved.status.settled !== undefined, true);
    assert.deepEqual(Array.from(resolved.alive), [false, false, false, false, true]);
    assert.equal(
      (await provider.connection.getBalance(players[4].publicKey)) - winnerBefore,
      5 * FEE.toNumber() - Math.floor(5 * FEE.toNumber() * FEE_BPS / 10_000)
    );
    assert.equal(
      (await provider.connection.getBalance(treasury)) - treasuryBefore,
      Math.floor(5 * FEE.toNumber() * FEE_BPS / 10_000)
    );
    assert.equal(finalRevealSignature !== undefined, true);
    assert.deepEqual(resolved.commitments, Array.from({ length: 5 }, () => Array(32).fill(0)));
    assert.deepEqual(resolved.revealedMoves, [255, 255, 255, 255, 255]);
    assert.equal(await provider.connection.getBalance(vault), 0);
  });

  it("rejects duplicate player joins", async () => {
    const id = new BN(Date.now() + 4);
    const { gm, vault } = await create(id);
    const player = Keypair.generate();
    await fund(player, 12);
    await join(gm, vault, player);
    try {
      await join(gm, vault, player);
      assert.fail();
    } catch (error: unknown) {
      assertProgramError(error, "AlreadyJoined");
    }
  });
});
