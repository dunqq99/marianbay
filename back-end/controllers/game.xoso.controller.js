const NguoiDung = require("../models/NguoiDung");
const HeThong = require("../models/HeThong");
const { BadRequestError, UnauthorizedError, NotFoundError } = require("../utils/app_error");
const catchAsync = require("../utils/catch_async");
const { convertMoney } = require("../utils/convertMoney");
const UserSocketService = require("../services/user.socket.service");
const TelegramService = require("../services/telegram.service");
const { default: mongoose } = require("mongoose");
const { OkResponse, CreatedResponse } = require("../utils/successResponse");
const { STATUS_GAME, STATUS_HISTORY_GAME, LOAI_CUOC_GAME, DEFAULT_SETTING_GAME } = require("../configs/game.xoso");
const { TYPE_SEND_MESSAGE } = require("../configs/telegram.config");
const BienDongSoDuServiceFactory = require("../services/biendongsodu.service");
const { TYPE_BALANCE_FLUCTUATION } = require("../configs/balance.fluctuation.config");
const { convertChiTietCuoc, convertLoaiCuoc, getTiLeDefault, convertKeyTiLe } = require("../utils/game/xoso");
const _ = require("lodash");
const AdminSocketService = require("../services/admin.socket.service");
const NhatKyHoatDong = require("../models/NhatKyHoatDong");
const { TYPE_ACTIVITY, ACTION_ACTIVITY } = require("../configs/activity.config");
class GameXoSoController {
  constructor({ CONFIG }) {
    this.CONFIG = CONFIG;
  }
  getTiLeGame = catchAsync(async (req, res, next) => {
    const results = await HeThong.findOne({
      systemID: 1,
    });

    const bangTiLe = Object.fromEntries(
      Object.values(LOAI_CUOC_GAME).map((loaiCuoc) => [
        loaiCuoc,
        results?.gameConfigs?.xoSoConfigs?.[`${this.CONFIG.KEY_SYSTEM_DB}`]?.[`${convertKeyTiLe(loaiCuoc)}`] ?? getTiLeDefault(loaiCuoc),
      ])
    );

    return new OkResponse({
      data: bangTiLe,
    }).send(res);
  });
  getAllLichSuGame = catchAsync(async (req, res, next) => {
    const page = req.query.page * 1 || 1;
    const results = req.query.results * 1 || 10;
    const skip = (page - 1) * results;
    let sortValue = ["-createdAt"];
    sortValue = sortValue.join(" ");
    const list = await this.CONFIG.MODEL.GAME_XOSO.find({
      tinhTrang: STATUS_GAME.HOAN_TAT,
    })
      .skip(skip)
      .limit(results)
      .sort(sortValue)
      .lean();
    return new OkResponse({
      data: list,
      metadata: {
        results: list.length,
        page,
        limitItems: results,
        sort: sortValue,
      },
    }).send(res);
  });

  createDatCuoc = catchAsync(async (req, res, next) => {
    const { phien, loaiCuoc, listSoCuoc, tienCuoc } = req.body;
    const { _id: userID } = req.user;
    const listSoCuocString = [];
    if (!tienCuoc || !_.isNumber(tienCuoc)) {
      throw new UnauthorizedError("Vui lòng chọn tiền cược hợp lệ");
    }
    if (parseInt(tienCuoc) <= 0) {
      throw new UnauthorizedError("Vui lòng chọn tiền cược hợp lệ");
    }
    if (!_.isArray(listSoCuoc)) {
      throw new UnauthorizedError("Vui lòng chọn số cược hợp lệ");
    }
    listSoCuoc.forEach((soCuoc) => {
      if (!_.isNumber(soCuoc)) {
        throw new UnauthorizedError("Vui lòng chọn số cược hợp lệ");
      } else {
        let convertToStringSoCuoc;
        if (loaiCuoc === LOAI_CUOC_GAME.BA_CANG) {
          convertToStringSoCuoc = soCuoc < 10 ? "00" + soCuoc : soCuoc < 100 ? "0" + soCuoc : "" + soCuoc;
        } else {
          convertToStringSoCuoc = soCuoc < 10 ? "0" + soCuoc : "" + soCuoc;
        }
        listSoCuocString.push(convertToStringSoCuoc);
      }
    });
    if (!Object.values(LOAI_CUOC_GAME).includes(loaiCuoc)) {
      throw new UnauthorizedError("Vui lòng chọn loại cược hợp lệ");
    }

    if (loaiCuoc === LOAI_CUOC_GAME.LO || loaiCuoc === LOAI_CUOC_GAME.DE || loaiCuoc === LOAI_CUOC_GAME.BA_CANG) {
      if (listSoCuoc.length < 1 || listSoCuoc.length > 10) {
        throw new UnauthorizedError("Vui lòng chọn số cược hợp lệ");
      }
    }
    if (loaiCuoc === LOAI_CUOC_GAME.LO_XIEN_2) {
      if (listSoCuoc.length !== 2) {
        throw new UnauthorizedError("Vui lòng chọn số cược hợp lệ (tối thiểu 2 số)");
      }
    }
    if (loaiCuoc === LOAI_CUOC_GAME.LO_XIEN_3) {
      if (listSoCuoc.length !== 3) {
        throw new UnauthorizedError("Vui lòng chọn số cược hợp lệ (tối thiểu 3 số)");
      }
    }
    if (loaiCuoc === LOAI_CUOC_GAME.LO_XIEN_4) {
      if (listSoCuoc.length !== 4) {
        throw new UnauthorizedError("Vui lòng chọn số cược hợp lệ (tối thiểu 4 số)");
      }
    }

    let retries = 3;

    while (retries > 0) {
      let isErrorUpdateMoneyConcurrency = false;

      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const findPhien = await this.CONFIG.MODEL.GAME_XOSO.findOne({
            phien,
            tinhTrang: STATUS_GAME.DANG_CHO,
          }).session(session);
          if (!findPhien) {
            throw new BadRequestError("Vui lòng chờ phiên mới");
          }

          const findUser = await NguoiDung.findOneAndUpdate(
            {
              _id: userID,
              isProcessing: { $ne: true },
            },
            { $set: { isProcessing: true, lockTimestamp: Date.now() } },
            { new: true, session }
          );

          if (!findUser) {
            isErrorUpdateMoneyConcurrency = true;
            throw new BadRequestError("Xảy ra lỗi, vui lòng thử lại sau");
          }

          const tongTienCuoc = tienCuoc * listSoCuoc.length;
          if (findUser.money < tongTienCuoc) {
            throw new BadRequestError("Không đủ tiền cược");
          }
          const updateTienNguoiDung = await NguoiDung.findOneAndUpdate(
            {
              _id: userID,
              isProcessing: true,
              money: { $gte: tongTienCuoc },
            },
            {
              $inc: { money: -tongTienCuoc, tienCuoc: tongTienCuoc },
              $set: { isProcessing: false },
            },
            {
              new: true,
              session,
            }
          );

          if (!updateTienNguoiDung) {
            isErrorUpdateMoneyConcurrency = true;
            throw new Error("Xảy ra lỗi, vui lòng thử lại sau");
          }
          // Insert lịch sử đặt cược
          const insertLichSuDatCuoc = await this.CONFIG.MODEL.LICH_SU_DAT_CUOC.create(
            [
              {
                tinhTrang: STATUS_HISTORY_GAME.DANG_CHO,
                phien: findPhien._id,
                nguoiDung: userID,
                datCuoc: [
                  {
                    loaiCuoc,
                    chiTietCuoc: listSoCuocString.map((soCuoc) => ({
                      so: soCuoc,
                      tienCuoc,
                    })),
                    tongTienCuoc,
                  },
                ],
              },
            ],
            {
              session,
            }
          );

          // Insert Biến động số dư
          let noiDungBienDongSoDu = `Cược ${convertLoaiCuoc(loaiCuoc)}: `;

          listSoCuocString.forEach((soCuoc) => {
            noiDungBienDongSoDu += `Chọn số ${soCuoc} - ${convertMoney(tienCuoc)} | `;
          });
          noiDungBienDongSoDu = noiDungBienDongSoDu.slice(0, -2);

          const insertBienDongSoDu = BienDongSoDuServiceFactory.createBienDong({
            type: TYPE_BALANCE_FLUCTUATION.GAME,
            payload: {
              nguoiDung: userID,
              tienTruoc: findUser.money,
              tienSau: findUser.money - tongTienCuoc,
              noiDung: `Cược game ${this.CONFIG.TYPE_GAME}: ${noiDungBienDongSoDu}`,
              loaiGame: this.CONFIG.ROOM,
            },
            options: {
              session,
            },
          });

          const insertNhatKyHoatDong = NhatKyHoatDong.insertNhatKyHoatDong({
            taiKhoan: req.user.taiKhoan,
            userId: req.user._id,
            typeActivity: TYPE_ACTIVITY.GAME,
            actionActivity: ACTION_ACTIVITY.GAME.DAT_CUOC,
            description: `Đặt cược game Xổ số ${this.CONFIG.TYPE_GAME} phiên ${findPhien.phien}`,
            metadata: {
              listSoCuocString,
              tongTienCuoc,
              taiKhoan: updateTienNguoiDung.taiKhoan,
              idDatCuoc: insertLichSuDatCuoc[0]._id,
            },

            options: {
              session,
            },
          });
          await Promise.all([insertBienDongSoDu, insertNhatKyHoatDong]);

          // Send event refetch users dashboard
          AdminSocketService.sendRoomAdmin({ key: "admin:refetch-data-game-transactionals-dashboard" });

          // Update số dư tài khoản realtime
          UserSocketService.updateUserBalance({ user: findUser.taiKhoan, updateBalance: -tongTienCuoc });

          // Send notification Telegram
          const noiDungBot = `${findUser.taiKhoan} vừa cược game ${this.CONFIG.TYPE_GAME} ở phiên ${phien}: ${noiDungBienDongSoDu}`;
          TelegramService.sendNotification({ content: noiDungBot, type: TYPE_SEND_MESSAGE.GAME });

          this.CONFIG.METHOD.SEND_ROOM_ADMIN_XOSO({
            key: `${this.CONFIG.ROOM}:admin:refetch-data-lich-su-cuoc-game`,
            data: { phien: findPhien._id },
          });
        });
        break;
      } catch (err) {
        if (isErrorUpdateMoneyConcurrency) {
          retries -= 1;
          if (retries === 0) {
            throw err;
          }
          await new Promise((resolve) => setTimeout(resolve, 100 * (3 - retries)));
        } else {
          throw err;
        }
      } finally {
        await NguoiDung.findOneAndUpdate(
          {
            _id: userID,
          },
          {
            $set: { isProcessing: false },
          },
          {
            session,
          }
        );
        await session.endSession();
      }
    }

    return new CreatedResponse({
      message: "Đặt cược thành công",
    }).send(res);
  });

  getAllLichSuCuocGame = catchAsync(async (req, res, next) => {
    const { _id: userID } = req.user;
    const page = req.query.page * 1 || 1;
    const results = req.query.results * 1 || 10;
    const skip = (page - 1) * results;
    let sortValue = ["-createdAt"];
    sortValue = sortValue.join(" ");
    const list = await this.CONFIG.MODEL.LICH_SU_DAT_CUOC.find({
      nguoiDung: userID,
    })
      .skip(skip)
      .limit(results)
      .sort(sortValue)
      .populate("phien")
      .lean();

    return new OkResponse({
      data: list,
      metadata: {
        results: list.length,
        page,
        limitItems: results,
        sort: sortValue,
      },
    }).send(res);
  });

  getLichSuCuocGameChiTiet = catchAsync(async (req, res, next) => {
    const { _id: userID } = req.user;
    const { phien } = req.params;
    const findPhien = await this.CONFIG.MODEL.GAME_XOSO.findOne({
      phien,
    });
    if (!findPhien) {
      throw new NotFoundError("Không tìm thấy phiên game");
    }

    const list = await this.CONFIG.MODEL.LICH_SU_DAT_CUOC.findOne({
      nguoiDung: userID,
      phien: findPhien._id,
    }).select("datCuoc");
    return new OkResponse({
      data: list,
    }).send(res);
  });
}
module.exports = GameXoSoController;
