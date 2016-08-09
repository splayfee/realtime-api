

'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('user',
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
        validate: {
          isInt: true
        }
      },
      first_name: {
        allowNull: false,
        type: DataTypes.STRING,
        validate: {
          len: [0, 75]
        }
      },
      last_name: {
        allowNull: false,
        type: DataTypes.STRING,
        validate: {
          len: [0, 75]
        }
      },
      email: {
        allowNull: false,
        type: DataTypes.STRING,
        validate: {
          len: [0, 255]
        }
      },
      password: {
        allowNull: false,
        type: DataTypes.STRING,
        validate: {
          len: [0, 255]
        }
      }
    },
    {
      underscored: true,
      classMethods: {
        associate: (models) => {
        }
      }
    }
  );
  return User;
};
