module.exports = (DataTypes) => ({
  name: '__name__',
  definition: {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ParentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Parent',
      },
      onUpdate: 'cascade',
      onDelete: 'cascade',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  associations: {
    Parent: (self, target) => self.belongsTo(target, { as: 'parent', foreignKey: 'ParentId' }),
    Child: (self, target) => self.hasMany(target, { as: 'children', foreignKey: '__name__Id' }),
  },
});
