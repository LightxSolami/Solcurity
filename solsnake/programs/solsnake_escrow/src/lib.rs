//! SOLSNAKE escrow. UNAUDITED. Devnet only; do not deploy to or fund on mainnet.
//! Flow: server creates a match -> 5 players deposit a fixed entry fee into a vault PDA -> the server
//! (authority) names the winner -> winner gets pot minus fee, treasury gets fee. If the server never
//! settles, every depositor can reclaim their own fee after REFUND_TIMEOUT.
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

// Placeholder (System Program id). Run `anchor keys sync` after the first `anchor build`.
declare_id!("11111111111111111111111111111111");

pub const MAX_PLAYERS: usize = 5;
pub const DEVELOPER_FEE_BPS: u16 = 50; // 0.5% of the total entry pool
pub const REFUND_TIMEOUT: i64 = 3_600; // seconds
pub const ALLOWED_FEES: [u64; 4] = [50_000_000, 100_000_000, 500_000_000, 1_000_000_000]; // 0.05 / 0.1 / 0.5 / 1 SOL
pub const DEVELOPER_TREASURY: Pubkey = Pubkey::new_from_array([
    183, 81, 141, 153, 15, 33, 63, 7, 24, 160, 184, 22, 235, 131, 183, 16, 127, 212, 101, 246, 253,
    8, 21, 11, 174, 212, 138, 125, 16, 195, 19, 35,
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
        require!(
            ALLOWED_FEES.contains(&entry_fee),
            EscrowError::InvalidEntryFee
        );
        require!(fee_bps == DEVELOPER_FEE_BPS, EscrowError::InvalidFeeRate);
        let m = &mut ctx.accounts.game_match;
        m.match_id = match_id;
        m.authority = ctx.accounts.authority.key();
        m.treasury = ctx.accounts.treasury.key();
        m.entry_fee = entry_fee;
        m.fee_bps = fee_bps;
        m.players = [Pubkey::default(); MAX_PLAYERS];
        m.refunded = [false; MAX_PLAYERS];
        m.count = 0;
        m.status = MatchStatus::Open;
        m.created_at = Clock::get()?.unix_timestamp;
        m.vault_bump = ctx.bumps.vault;
        Ok(())
    }

    pub fn join_match(ctx: Context<JoinMatch>) -> Result<()> {
        let fee;
        {
            let m = &ctx.accounts.game_match;
            let p = ctx.accounts.player.key();
            require!(m.status == MatchStatus::Open, EscrowError::NotOpen);
            require!((m.count as usize) < MAX_PLAYERS, EscrowError::MatchFull);
            require!(
                !m.players[..m.count as usize].contains(&p),
                EscrowError::AlreadyJoined
            );
            fee = m.entry_fee;
        }
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.player.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            fee,
        )?;
        let p = ctx.accounts.player.key();
        let m = &mut ctx.accounts.game_match;
        let i = m.count as usize;
        m.players[i] = p;
        m.count = m.count.checked_add(1).ok_or(EscrowError::MathOverflow)?;
        Ok(())
    }

    pub fn settle_match(ctx: Context<SettleMatch>, winner: Pubkey) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let (prize, fee, key, bump);
        {
            let m = &ctx.accounts.game_match;
            require!(m.status == MatchStatus::Open, EscrowError::NotOpen);
            require!(m.count as usize == MAX_PLAYERS, EscrowError::NotFull);
            require!(
                now <= m
                    .created_at
                    .checked_add(REFUND_TIMEOUT)
                    .ok_or(EscrowError::MathOverflow)?,
                EscrowError::SettleTooLate
            );
            require!(m.players.contains(&winner), EscrowError::WinnerNotPlayer);
            require!(
                ctx.remaining_accounts.len() == MAX_PLAYERS,
                EscrowError::MissingPlayerApprovals
            );
            for (index, player) in ctx.remaining_accounts.iter().enumerate() {
                require!(
                    player.is_signer && player.key() == m.players[index],
                    EscrowError::MissingPlayerApprovals
                );
            }
            let pot = (m.entry_fee as u128)
                .checked_mul(m.count as u128)
                .ok_or(EscrowError::MathOverflow)?;
            let f = pot
                .checked_mul(m.fee_bps as u128)
                .ok_or(EscrowError::MathOverflow)?
                .checked_div(10_000)
                .ok_or(EscrowError::MathOverflow)?;
            fee = u64::try_from(f).map_err(|_| EscrowError::MathOverflow)?;
            prize = u64::try_from(pot.checked_sub(f).ok_or(EscrowError::MathOverflow)?)
                .map_err(|_| EscrowError::MathOverflow)?;
            key = m.key();
            bump = m.vault_bump;
        }
        let seeds: &[&[u8]] = &[b"vault", key.as_ref(), &[bump]];
        let vault = ctx.accounts.vault.to_account_info();
        let sp = ctx.accounts.system_program.to_account_info();
        transfer(
            CpiContext::new_with_signer(
                sp.clone(),
                Transfer {
                    from: vault.clone(),
                    to: ctx.accounts.winner_account.to_account_info(),
                },
                &[seeds],
            ),
            prize,
        )?;
        if fee > 0 {
            transfer(
                CpiContext::new_with_signer(
                    sp,
                    Transfer {
                        from: vault,
                        to: ctx.accounts.treasury.to_account_info(),
                    },
                    &[seeds],
                ),
                fee,
            )?;
        }
        ctx.accounts.game_match.status = MatchStatus::Settled; // closes replay / double-claim
        Ok(())
    }

    /// Anyone who deposited can reclaim their own fee once the timeout has passed and the match is unsettled.
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let (fee, idx, key, bump);
        {
            let m = &ctx.accounts.game_match;
            require!(
                m.status == MatchStatus::Open || m.status == MatchStatus::Cancelled,
                EscrowError::NotRefundable
            );
            require!(
                now > m
                    .created_at
                    .checked_add(REFUND_TIMEOUT)
                    .ok_or(EscrowError::MathOverflow)?,
                EscrowError::TooEarly
            );
            let p = ctx.accounts.player.key();
            idx = m.players[..m.count as usize]
                .iter()
                .position(|k| *k == p)
                .ok_or(EscrowError::NotAPlayer)?;
            require!(!m.refunded[idx], EscrowError::AlreadyRefunded);
            fee = m.entry_fee;
            key = m.key();
            bump = m.vault_bump;
        }
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
        let m = &mut ctx.accounts.game_match;
        m.refunded[idx] = true;
        m.status = MatchStatus::Cancelled;
        Ok(())
    }
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
    #[account(mut)]
    pub game_match: Account<'info, GameMatch>,
    #[account(mut, seeds = [b"vault", game_match.key().as_ref()], bump = game_match.vault_bump)]
    pub vault: SystemAccount<'info>,
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(winner: Pubkey)]
pub struct SettleMatch<'info> {
    #[account(mut, has_one = authority @ EscrowError::Unauthorized, has_one = treasury @ EscrowError::BadTreasury)]
    pub game_match: Account<'info, GameMatch>,
    #[account(mut, seeds = [b"vault", game_match.key().as_ref()], bump = game_match.vault_bump)]
    pub vault: SystemAccount<'info>,
    pub authority: Signer<'info>,
    #[account(mut, address = winner @ EscrowError::WinnerNotPlayer)]
    pub winner_account: SystemAccount<'info>,
    #[account(mut)]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Refund<'info> {
    #[account(mut)]
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
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MatchStatus {
    Open,
    Settled,
    Cancelled,
}

#[error_code]
pub enum EscrowError {
    #[msg("Entry fee must be 0.05, 0.1, 0.5 or 1 SOL")]
    InvalidEntryFee,
    #[msg("Developer fee must be exactly 0.5%")]
    InvalidFeeRate,
    #[msg("Match is not open")]
    NotOpen,
    #[msg("Match is full")]
    MatchFull,
    #[msg("Match is not full yet")]
    NotFull,
    #[msg("Every match participant must approve settlement")]
    MissingPlayerApprovals,
    #[msg("Player already joined")]
    AlreadyJoined,
    #[msg("Only the match authority can do this")]
    Unauthorized,
    #[msg("Treasury account mismatch")]
    BadTreasury,
    #[msg("Winner is not a player of this match")]
    WinnerNotPlayer,
    #[msg("Settlement window has passed")]
    SettleTooLate,
    #[msg("Match cannot be refunded")]
    NotRefundable,
    #[msg("Refund timeout has not passed")]
    TooEarly,
    #[msg("Signer is not a player of this match")]
    NotAPlayer,
    #[msg("Refund already claimed")]
    AlreadyRefunded,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::Discriminator;

    // These byte offsets and discriminators are hard-coded in server/chain.js and client/online.html.
    // If this test fails, update those files.
    #[test]
    fn layout_matches_offchain_parsers() {
        let m = GameMatch {
            match_id: 0x0102030405060708,
            authority: Pubkey::new_from_array([1; 32]),
            treasury: Pubkey::new_from_array([2; 32]),
            entry_fee: 500_000_000,
            fee_bps: DEVELOPER_FEE_BPS,
            players: [Pubkey::new_from_array([3; 32]); MAX_PLAYERS],
            refunded: [false, true, false, false, false],
            count: 5,
            status: MatchStatus::Settled,
            created_at: 1_700_000_000,
            vault_bump: 254,
        };
        let b = m.try_to_vec().unwrap();
        assert_eq!(b.len(), GameMatch::INIT_SPACE);
        assert_eq!(GameMatch::INIT_SPACE, 258);
        assert_eq!(&b[0..8], &0x0102030405060708u64.to_le_bytes());
        assert_eq!(&b[8..40], &[1u8; 32]);
        assert_eq!(&b[40..72], &[2u8; 32]);
        assert_eq!(&b[72..80], &500_000_000u64.to_le_bytes());
        assert_eq!(&b[80..82], &DEVELOPER_FEE_BPS.to_le_bytes());
        assert_eq!(&b[82..242], &[3u8; 160]);
        assert_eq!(&b[242..247], &[0, 1, 0, 0, 0]);
        assert_eq!(b[247], 5);
        assert_eq!(b[248], 1); // Settled
        assert_eq!(&b[249..257], &1_700_000_000i64.to_le_bytes());
        assert_eq!(b[257], 254);
    }

    #[test]
    fn discriminators_match_offchain_constants() {
        assert_eq!(
            instruction::CreateMatch::DISCRIMINATOR,
            [107, 2, 184, 145, 70, 142, 17, 165]
        );
        assert_eq!(
            instruction::JoinMatch::DISCRIMINATOR,
            [244, 8, 47, 130, 192, 59, 179, 44]
        );
        assert_eq!(
            instruction::SettleMatch::DISCRIMINATOR,
            [71, 124, 117, 96, 191, 217, 116, 24]
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
    fn fee_math_is_exact() {
        let pot = 5u128 * 1_000_000_000;
        let fee = pot * DEVELOPER_FEE_BPS as u128 / 10_000;
        assert_eq!(fee, 25_000_000);
        assert_eq!(pot - fee, 4_975_000_000);
    }
}
