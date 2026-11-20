// Deterministic, turn-based SOLSNAKE escrow game. The program resolves every move.
// Devnet only at the server/configuration layer; this program is not audited.
use anchor_lang::prelude::*;
use anchor_lang::solana_program::hash::hashv;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("rRMcWb1sJeaPZBKzsj3ah7s93FAmevCkqHi3dstP4bC");

pub const MAX_PLAYERS: usize = 5;
pub const BODY_LEN: usize = 3;
pub const BOARD_SIZE: u16 = 32;
pub const MAX_ROUNDS: u16 = 256;
pub const NO_MOVE: u8 = u8::MAX;
pub const DEVELOPER_FEE_BPS: u16 = 50;
pub const REFUND_TIMEOUT: i64 = 3_600;
pub const ALLOWED_FEES: [u64; 3] = [500_000_000, 1_000_000_000, 10_000_000_000];
pub const DEVELOPER_TREASURY: Pubkey = Pubkey::new_from_array([
    183, 81, 141, 153, 15, 33, 63, 7, 24, 160, 184, 22, 235, 131, 183, 16, 127, 212, 101, 246,
    253, 8, 21, 11, 174, 212, 138, 125, 16, 195, 19, 35,
]);

#[program]
pub mod solsnake_escrow {
    use super::*;

    pub fn create_match(
        ctx: Context<CreateMatch>,
        match_id: u64,
        entry_fee: u64,
        fee_bps: u16,
    ) -> Result<()> {
        require!(ALLOWED_FEES.contains(&entry_fee), EscrowError::InvalidEntryFee);
        require!(fee_bps == DEVELOPER_FEE_BPS, EscrowError::InvalidFeeRate);

        let game_match = &mut ctx.accounts.game_match;
        game_match.match_id = match_id;
        game_match.authority = ctx.accounts.authority.key();
        game_match.treasury = ctx.accounts.treasury.key();
        game_match.entry_fee = entry_fee;
        game_match.fee_bps = fee_bps;
        game_match.players = [Pubkey::default(); MAX_PLAYERS];
        game_match.refunded = [false; MAX_PLAYERS];
        game_match.count = 0;
        game_match.status = MatchStatus::Open;
        game_match.created_at = Clock::get()?.unix_timestamp;
        game_match.vault_bump = ctx.bumps.vault;
        game_match.positions = [[0; BODY_LEN]; MAX_PLAYERS];
        game_match.directions = [0; MAX_PLAYERS];
        game_match.alive = [false; MAX_PLAYERS];
        game_match.commitments = [[0; 32]; MAX_PLAYERS];
        game_match.revealed_moves = [NO_MOVE; MAX_PLAYERS];
        game_match.round = 0;
        game_match.revealing = false;
        Ok(())
    }

    pub fn join_match(ctx: Context<JoinMatch>) -> Result<()> {
        let game_match = &ctx.accounts.game_match;
        require!(game_match.status == MatchStatus::Open, EscrowError::NotOpen);
        require!((game_match.count as usize) < MAX_PLAYERS, EscrowError::MatchFull);
        let player = ctx.accounts.player.key();
        require!(
            !game_match.players[..game_match.count as usize].contains(&player),
            EscrowError::AlreadyJoined
        );

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            game_match.entry_fee,
        )?;

        let game_match = &mut ctx.accounts.game_match;
        let index = game_match.count as usize;
        game_match.players[index] = player;
        game_match.positions[index] = spawn(index);
        game_match.directions[index] = spawn_direction(index);
        game_match.alive[index] = true;
        game_match.count = game_match
            .count
            .checked_add(1)
            .ok_or(EscrowError::MathOverflow)?;
        Ok(())
    }

    pub fn commit_move(ctx: Context<CommitMove>, commitment: [u8; 32]) -> Result<()> {
        require!(commitment != [0; 32], EscrowError::InvalidCommitment);
        let game_match = &mut ctx.accounts.game_match;
        require!(game_match.status == MatchStatus::Open, EscrowError::NotOpen);
        require!(game_match.count as usize == MAX_PLAYERS, EscrowError::NotFull);
        require!(!game_match.revealing, EscrowError::CommitPhaseClosed);

        let player = ctx.accounts.player.key();
        let index = game_match.players[..MAX_PLAYERS]
            .iter()
            .position(|key| *key == player)
            .ok_or(EscrowError::NotAPlayer)?;
        require!(game_match.alive[index], EscrowError::Eliminated);
        require!(
            game_match.commitments[index] == [0; 32],
            EscrowError::MoveAlreadyCommitted
        );
        game_match.commitments[index] = commitment;
        if (0..MAX_PLAYERS).all(|i| {
            !game_match.alive[i] || game_match.commitments[i] != [0; 32]
        }) {
            game_match.revealing = true;
        }
        Ok(())
    }

    pub fn reveal_move<'info>(
        ctx: Context<'_, '_, '_, 'info, RevealMove<'info>>,
        direction: u8,
        salt: [u8; 32],
    ) -> Result<()> {
        require!(direction < 4, EscrowError::InvalidDirection);
        let game_match = &mut ctx.accounts.game_match;
        require!(game_match.status == MatchStatus::Open, EscrowError::NotOpen);
        require!(game_match.count as usize == MAX_PLAYERS, EscrowError::NotFull);
        require!(game_match.revealing, EscrowError::RevealNotStarted);

        let player = ctx.accounts.player.key();
        let index = game_match.players[..MAX_PLAYERS]
            .iter()
            .position(|key| *key == player)
            .ok_or(EscrowError::NotAPlayer)?;
        require!(game_match.alive[index], EscrowError::Eliminated);
        require!(
            game_match.revealed_moves[index] == NO_MOVE,
            EscrowError::MoveAlreadyRevealed
        );
        require!(
            direction != (game_match.directions[index] + 2) % 4,
            EscrowError::ReverseMove
        );
        let expected = move_commitment(
            game_match.match_id,
            game_match.round,
            player,
            direction,
            salt,
        );
        require!(
            game_match.commitments[index] == expected,
            EscrowError::InvalidReveal
        );
        game_match.revealed_moves[index] = direction;
        if !(0..MAX_PLAYERS).all(|i| {
            !game_match.alive[i] || game_match.revealed_moves[i] != NO_MOVE
        }) {
            return Ok(());
        }

        let survivors = {
            let moves = game_match.revealed_moves;
            let GameMatch {
                positions,
                directions,
                alive,
                ..
            } = &mut **game_match;
            resolve_round(positions, directions, alive, moves)
        };
        game_match.commitments = [[0; 32]; MAX_PLAYERS];
        game_match.revealed_moves = [NO_MOVE; MAX_PLAYERS];
        game_match.revealing = false;

        if survivors <= 1 {
            if survivors == 0 {
                game_match.status = MatchStatus::Draw;
                return Ok(());
            }
            let winner_index = game_match
                .alive
                .iter()
                .position(|is_alive| *is_alive)
                .ok_or(EscrowError::NoWinner)?;
            settle_winner(
                game_match,
                &ctx.accounts.vault,
                &ctx.accounts.treasury,
                &ctx.accounts.system_program,
                ctx.remaining_accounts,
                winner_index,
            )?;
            return Ok(());
        }

        game_match.round = game_match
            .round
            .checked_add(1)
            .ok_or(EscrowError::MathOverflow)?;
        if game_match.round >= MAX_ROUNDS {
            game_match.status = MatchStatus::Draw;
        }
        Ok(())
    }

    /// A player can recover their stake after a stalled match, or immediately after a draw.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let game_match = &ctx.accounts.game_match;
        require!(
            game_match.status != MatchStatus::Settled,
            EscrowError::NotRefundable
        );
        let expired = now
            > game_match
                .created_at
                .checked_add(REFUND_TIMEOUT)
                .ok_or(EscrowError::MathOverflow)?;
        require!(
            game_match.status == MatchStatus::Draw
                || game_match.status == MatchStatus::Cancelled
                || expired,
            EscrowError::TooEarly
        );

        let player = ctx.accounts.player.key();
        let index = game_match.players[..game_match.count as usize]
            .iter()
            .position(|key| *key == player)
            .ok_or(EscrowError::NotAPlayer)?;
        require!(!game_match.refunded[index], EscrowError::AlreadyRefunded);

        let fee = game_match.entry_fee;
        let key = game_match.key();
        let bump = game_match.vault_bump;
        let seeds: &[&[u8]] = &[b"vault", key.as_ref(), &[bump]];
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.player.to_account_info(),
                },
                &[seeds],
            ),
            fee,
        )?;

        let game_match = &mut ctx.accounts.game_match;
        game_match.refunded[index] = true;
        if game_match.status == MatchStatus::Open {
            game_match.status = MatchStatus::Cancelled;
        }
        Ok(())
    }
}

fn settle_winner<'info>(
    game_match: &mut Account<'info, GameMatch>,
    vault: &SystemAccount<'info>,
    treasury: &SystemAccount<'info>,
    system_program: &Program<'info, System>,
    player_accounts: &[AccountInfo<'info>],
    winner_index: usize,
) -> Result<()> {
    require!(player_accounts.len() == MAX_PLAYERS, EscrowError::InvalidPlayerAccounts);
    for (index, account) in player_accounts.iter().enumerate() {
        require!(
            account.key() == game_match.players[index] && account.is_writable,
            EscrowError::InvalidPlayerAccounts
        );
    }
    let winner = player_accounts
        .get(winner_index)
        .ok_or(EscrowError::NoWinner)?;
    let pot = (game_match.entry_fee as u128)
        .checked_mul(MAX_PLAYERS as u128)
        .ok_or(EscrowError::MathOverflow)?;
    let fee = pot
        .checked_mul(game_match.fee_bps as u128)
        .ok_or(EscrowError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(EscrowError::MathOverflow)?;
    let fee = u64::try_from(fee).map_err(|_| EscrowError::MathOverflow)?;
    let prize = u64::try_from(pot - fee as u128).map_err(|_| EscrowError::MathOverflow)?;

    let key = game_match.key();
    let bump = game_match.vault_bump;
    let seeds: &[&[u8]] = &[b"vault", key.as_ref(), &[bump]];
    transfer(
        CpiContext::new_with_signer(
            system_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: winner.clone(),
            },
            &[seeds],
        ),
        prize,
    )?;
    if fee > 0 {
        transfer(
            CpiContext::new_with_signer(
                system_program.to_account_info(),
                Transfer {
                    from: vault.to_account_info(),
                    to: treasury.to_account_info(),
                },
                &[seeds],
            ),
            fee,
        )?;
    }
    game_match.status = MatchStatus::Settled;
    Ok(())
}

fn spawn(index: usize) -> [u16; BODY_LEN] {
    match index {
        0 => [4 * BOARD_SIZE + 4, 4 * BOARD_SIZE + 3, 4 * BOARD_SIZE + 2],
        1 => [4 * BOARD_SIZE + 27, 3 * BOARD_SIZE + 27, 2 * BOARD_SIZE + 27],
        2 => [27 * BOARD_SIZE + 27, 27 * BOARD_SIZE + 28, 27 * BOARD_SIZE + 29],
        3 => [27 * BOARD_SIZE + 4, 28 * BOARD_SIZE + 4, 29 * BOARD_SIZE + 4],
        _ => [16 * BOARD_SIZE + 16, 17 * BOARD_SIZE + 16, 18 * BOARD_SIZE + 16],
    }
}

fn spawn_direction(index: usize) -> u8 {
    match index {
        0 => 1,
        1 => 2,
        2 => 3,
        _ => 0,
    }
}

fn next_cell(cell: u16, direction: u8) -> Option<u16> {
    let row = cell / BOARD_SIZE;
    let column = cell % BOARD_SIZE;
    match direction {
        0 if row > 0 => Some(cell - BOARD_SIZE),
        1 if column + 1 < BOARD_SIZE => Some(cell + 1),
        2 if row + 1 < BOARD_SIZE => Some(cell + BOARD_SIZE),
        3 if column > 0 => Some(cell - 1),
        _ => None,
    }
}

fn move_commitment(
    match_id: u64,
    round: u16,
    player: Pubkey,
    direction: u8,
    salt: [u8; 32],
) -> [u8; 32] {
    hashv(&[
        b"solsnake-move-v1",
        &match_id.to_le_bytes(),
        &round.to_le_bytes(),
        player.as_ref(),
        &[direction],
        &salt,
    ])
    .to_bytes()
}

fn resolve_round(
    positions: &mut [[u16; BODY_LEN]; MAX_PLAYERS],
    directions: &mut [u8; MAX_PLAYERS],
    alive: &mut [bool; MAX_PLAYERS],
    moves: [u8; MAX_PLAYERS],
) -> usize {
    let mut destinations = [None; MAX_PLAYERS];
    let mut eliminated = [false; MAX_PLAYERS];
    for index in 0..MAX_PLAYERS {
        if alive[index] {
            destinations[index] = next_cell(positions[index][0], moves[index]);
            eliminated[index] = destinations[index].is_none();
        }
    }

    for index in 0..MAX_PLAYERS {
        let Some(destination) = destinations[index] else {
            continue;
        };
        for other in 0..MAX_PLAYERS {
            if !alive[other] {
                continue;
            }
            if other != index && destinations[other] == Some(destination) {
                eliminated[index] = true;
                eliminated[other] = true;
            }
            for body_cell in positions[other].iter().take(BODY_LEN - 1) {
                if *body_cell == destination {
                    eliminated[index] = true;
                }
            }
        }
    }

    for index in 0..MAX_PLAYERS {
        if !alive[index] {
            continue;
        }
        if eliminated[index] {
            alive[index] = false;
        } else if let Some(destination) = destinations[index] {
            positions[index] = [destination, positions[index][0], positions[index][1]];
            directions[index] = moves[index];
        }
    }
    alive.iter().filter(|is_alive| **is_alive).count()
}

#[derive(Accounts)]
#[instruction(match_id: u64)]
pub struct CreateMatch<'info> {
    #[account(init, payer = authority, space = 8 + GameMatch::INIT_SPACE, seeds = [b"match", match_id.to_le_bytes().as_ref()], bump)]
    pub game_match: Account<'info, GameMatch>,
    #[account(seeds = [b"vault", game_match.key().as_ref()], bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(address = DEVELOPER_TREASURY @ EscrowError::BadTreasury)]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinMatch<'info> {
    #[account(mut, seeds = [b"match", game_match.match_id.to_le_bytes().as_ref()], bump)]
    pub game_match: Account<'info, GameMatch>,
    #[account(mut, seeds = [b"vault", game_match.key().as_ref()], bump = game_match.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CommitMove<'info> {
    #[account(mut, seeds = [b"match", game_match.match_id.to_le_bytes().as_ref()], bump)]
    pub game_match: Account<'info, GameMatch>,
    pub player: Signer<'info>,
}

#[derive(Accounts)]
pub struct RevealMove<'info> {
    #[account(mut, seeds = [b"match", game_match.match_id.to_le_bytes().as_ref()], bump)]
    pub game_match: Account<'info, GameMatch>,
    #[account(mut, seeds = [b"vault", game_match.key().as_ref()], bump = game_match.vault_bump)]
    pub vault: SystemAccount<'info>,
    pub player: Signer<'info>,
    #[account(mut, address = game_match.treasury @ EscrowError::BadTreasury)]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut, seeds = [b"match", game_match.match_id.to_le_bytes().as_ref()], bump)]
    pub game_match: Account<'info, GameMatch>,
    #[account(mut, seeds = [b"vault", game_match.key().as_ref()], bump = game_match.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct GameMatch {
    pub match_id: u64,
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub entry_fee: u64,
    pub fee_bps: u16,
    pub players: [Pubkey; MAX_PLAYERS],
    pub refunded: [bool; MAX_PLAYERS],
    pub count: u8,
    pub status: MatchStatus,
    pub created_at: i64,
    pub vault_bump: u8,
    pub positions: [[u16; BODY_LEN]; MAX_PLAYERS],
    pub directions: [u8; MAX_PLAYERS],
    pub alive: [bool; MAX_PLAYERS],
    pub commitments: [[u8; 32]; MAX_PLAYERS],
    pub revealed_moves: [u8; MAX_PLAYERS],
    pub round: u16,
    pub revealing: bool,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MatchStatus {
    Open,
    Settled,
    Cancelled,
    Draw,
}

#[error_code]
pub enum EscrowError {
    #[msg("Entry fee must be 0.5, 1 or 10 SOL")]
    InvalidEntryFee,
    #[msg("Developer fee must be exactly 0.5%")]
    InvalidFeeRate,
    #[msg("Match is not open")]
    NotOpen,
    #[msg("Match is full")]
    MatchFull,
    #[msg("Match is not full yet")]
    NotFull,
    #[msg("Player already joined")]
    AlreadyJoined,
    #[msg("Player is not alive")]
    Eliminated,
    #[msg("Player already submitted a move this round")]
    MoveAlreadyCommitted,
    #[msg("Move was already revealed this round")]
    MoveAlreadyRevealed,
    #[msg("All living players must commit before moves can be revealed")]
    RevealNotStarted,
    #[msg("The move commitment phase is closed")]
    CommitPhaseClosed,
    #[msg("Move commitment does not match the revealed direction")]
    InvalidReveal,
    #[msg("Move commitment cannot be empty")]
    InvalidCommitment,
    #[msg("A snake cannot reverse direction")]
    ReverseMove,
    #[msg("Direction must be north, east, south or west")]
    InvalidDirection,
    #[msg("Treasury account mismatch")]
    BadTreasury,
    #[msg("Signer is not a player")]
    NotAPlayer,
    #[msg("All five player payout accounts must be provided in match order")]
    InvalidPlayerAccounts,
    #[msg("No winner is available")]
    NoWinner,
    #[msg("Match cannot be refunded")]
    NotRefundable,
    #[msg("Refund timeout has not passed")]
    TooEarly,
    #[msg("Refund already claimed")]
    AlreadyRefunded,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::Discriminator;

    fn empty_game() -> GameMatch {
        GameMatch {
            match_id: 0,
            authority: Pubkey::default(),
            treasury: Pubkey::default(),
            entry_fee: 500_000_000,
            fee_bps: DEVELOPER_FEE_BPS,
            players: [Pubkey::default(); MAX_PLAYERS],
            refunded: [false; MAX_PLAYERS],
            count: 0,
            status: MatchStatus::Open,
            created_at: 1_700_000_000,
            vault_bump: 254,
            positions: [[0; BODY_LEN]; MAX_PLAYERS],
            directions: [0; MAX_PLAYERS],
            alive: [false; MAX_PLAYERS],
            commitments: [[0; 32]; MAX_PLAYERS],
            revealed_moves: [NO_MOVE; MAX_PLAYERS],
            round: 0,
            revealing: false,
        }
    }

    #[test]
    fn layout_matches_server_parser() {
        let mut game = empty_game();
        game.match_id = 0x0102030405060708;
        game.authority = Pubkey::new_from_array([1; 32]);
        game.treasury = Pubkey::new_from_array([2; 32]);
        game.players = [Pubkey::new_from_array([3; 32]); MAX_PLAYERS];
        game.positions = [[0x0102, 0x0304, 0x0506]; MAX_PLAYERS];
        game.directions = [1; MAX_PLAYERS];
        game.alive = [true; MAX_PLAYERS];
        game.commitments = [[4; 32]; MAX_PLAYERS];
        game.revealed_moves = [NO_MOVE; MAX_PLAYERS];
        game.count = 5;
        game.status = MatchStatus::Draw;
        game.revealing = true;
        let bytes = game.try_to_vec().unwrap();
        assert_eq!(GameMatch::INIT_SPACE, 466);
        assert_eq!(bytes.len(), GameMatch::INIT_SPACE);
        assert_eq!(&bytes[0..8], &game.match_id.to_le_bytes());
        assert_eq!(&bytes[8..40], &[1u8; 32]);
        assert_eq!(&bytes[40..72], &[2u8; 32]);
        assert_eq!(&bytes[82..242], &[3u8; 160]);
        assert_eq!(bytes[247], 5);
        assert_eq!(bytes[248], 3);
        assert_eq!(&bytes[258..264], &[2, 1, 4, 3, 6, 5]);
        assert_eq!(&bytes[288..293], &[1; 5]);
        assert_eq!(&bytes[293..298], &[1; 5]);
        assert_eq!(&bytes[298..458], &[4; 160]);
        assert_eq!(&bytes[458..463], &[NO_MOVE; 5]);
        assert_eq!(&bytes[463..465], &[0, 0]);
        assert_eq!(bytes[465], 1);
    }

    #[test]
    fn instruction_and_account_discriminators_are_stable() {
        assert_eq!(
            instruction::CreateMatch::DISCRIMINATOR,
            [107, 2, 184, 145, 70, 142, 17, 165]
        );
        assert_eq!(
            instruction::JoinMatch::DISCRIMINATOR,
            [244, 8, 47, 130, 192, 59, 179, 44]
        );
        assert_eq!(
            instruction::CommitMove::DISCRIMINATOR,
            [27, 16, 69, 212, 175, 110, 123, 189]
        );
        assert_eq!(
            instruction::RevealMove::DISCRIMINATOR,
            [30, 133, 198, 26, 106, 44, 55, 149]
        );
        assert_eq!(
            instruction::Refund::DISCRIMINATOR,
            [2, 96, 183, 251, 63, 208, 46, 46]
        );
        assert_eq!(
            GameMatch::DISCRIMINATOR,
            [87, 187, 102, 98, 236, 52, 127, 39]
        );
    }

    #[test]
    fn moves_resolve_simultaneously_and_head_on_collisions_eliminate_both() {
        let mut positions = [[0; BODY_LEN]; MAX_PLAYERS];
        let mut directions = [0; MAX_PLAYERS];
        let mut alive = [false; MAX_PLAYERS];
        positions[0] = [33, 32, 31];
        positions[1] = [35, 36, 37];
        directions[0] = 1;
        directions[1] = 3;
        alive[0] = true;
        alive[1] = true;

        let survivors = resolve_round(
            &mut positions,
            &mut directions,
            &mut alive,
            [1, 3, NO_MOVE, NO_MOVE, NO_MOVE],
        );
        assert_eq!(survivors, 0);
        assert!(!alive[0]);
        assert!(!alive[1]);
    }

    #[test]
    fn moves_allow_vacated_tails_and_eliminate_wall_collisions() {
        let mut positions = [[0; BODY_LEN]; MAX_PLAYERS];
        let mut directions = [0; MAX_PLAYERS];
        let mut alive = [false; MAX_PLAYERS];
        positions[0] = [33, 32, 31];
        positions[1] = [30, 29, 28];
        directions[0] = 1;
        directions[1] = 1;
        alive[0] = true;
        alive[1] = true;

        let survivors = resolve_round(
            &mut positions,
            &mut directions,
            &mut alive,
            [1, 1, NO_MOVE, NO_MOVE, NO_MOVE],
        );
        assert_eq!(survivors, 2);
        assert_eq!(positions[0], [34, 33, 32]);
        assert_eq!(positions[1], [31, 30, 29]);

        let mut positions = [[0; BODY_LEN]; MAX_PLAYERS];
        let mut directions = [0; MAX_PLAYERS];
        let mut alive = [false; MAX_PLAYERS];
        positions[0] = [0, 1, 2];
        alive[0] = true;
        assert_eq!(
            resolve_round(
                &mut positions,
                &mut directions,
                &mut alive,
                [0, NO_MOVE, NO_MOVE, NO_MOVE, NO_MOVE],
            ),
            0
        );
    }

    #[test]
    fn spawn_positions_are_distinct_and_inside_the_board() {
        let mut occupied = Vec::new();
        for index in 0..MAX_PLAYERS {
            for cell in spawn(index) {
                assert!(cell < BOARD_SIZE * BOARD_SIZE);
                assert!(!occupied.contains(&cell));
                occupied.push(cell);
            }
        }
        assert_eq!(occupied.len(), MAX_PLAYERS * BODY_LEN);
    }

    #[test]
    fn move_commitment_binds_player_round_and_direction() {
        let player = Pubkey::new_from_array([9; 32]);
        let salt = [7; 32];
        let commitment = move_commitment(42, 3, player, 1, salt);
        assert_eq!(
            commitment,
            [
                62, 235, 151, 109, 224, 168, 166, 72, 51, 51, 137, 180, 225, 236, 79, 46, 88, 48,
                240, 33, 82, 237, 79, 91, 156, 182, 129, 146, 55, 89, 168, 243,
            ]
        );
        assert_ne!(commitment, move_commitment(42, 4, player, 1, salt));
        assert_ne!(commitment, move_commitment(42, 3, player, 2, salt));
        assert_ne!(
            commitment,
            move_commitment(42, 3, Pubkey::new_from_array([8; 32]), 1, salt)
        );
    }
}
