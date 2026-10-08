import { DailyBalance } from './DailyBalance';
import { Receipt } from './Receipt';
import { User } from './User';

/**
 * Registers the associations between the models.
 *
 * Must be called once before synchronizing the schema so that Sequelize can
 * generate the correct foreign-key constraints (`fk_user`, `fk_daily_balance`).
 */
export function initModels(): void {
  User.hasMany(DailyBalance, { foreignKey: 'fk_user' });
  DailyBalance.belongsTo(User, { foreignKey: 'fk_user' });

  User.hasMany(Receipt, { foreignKey: 'fk_user' });
  Receipt.belongsTo(User, { foreignKey: 'fk_user' });

  DailyBalance.hasMany(Receipt, { foreignKey: 'fk_daily_balance' });
  Receipt.belongsTo(DailyBalance, { foreignKey: 'fk_daily_balance' });
}

export { User, DailyBalance, Receipt };
