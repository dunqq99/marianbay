import { TINH_TRANG_GAME } from "@/configs/game.xucxac.config";
import SocketContext from "@/context/socket";
import { getRandomArbitrary } from "@/utils/xucxac";
import { Box, Button, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";
import { memo, useContext, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
const BoxContainer = styled(Box)(({ theme }) => ({
  background: "#00b977",
  borderRadius: "10px",
  height: "12rem",
  marginTop: "30px",
  maxWidth: "50rem",
  width: "100%",
  padding: "10px",
  position: "relative",
  "&:before, &:after": {
    content: `""`,
    display: "block",
    height: "0.69333rem",
    position: "absolute",
    top: "50%",

    transform: "translateY(-50%)",
    width: "0.13333rem",
    zIndex: 0,
  },
  "&:before": {
    background: "#008b59",
    borderRadius: "0.13333rem 0 0 0.13333rem",
    left: "-0.13333rem",
  },
  "&:after": {
    background: "#008b59",
    borderRadius: "0.13333rem 0 0 0.13333rem",
    right: "-0.13333rem",
  },
  "& .box": {
    gap: "5px",
    alignItems: "center",
    background: "#003c26",
    borderRadius: "0.13333rem",
    display: "flex",
    height: "100%",
    justifyContent: "space-between",
    padding: "5px",
    position: "relative",
    width: "100%",
    "&:before, &:after": {
      content: `""`,
      borderBottom: "10px solid transparent",
      borderTop: "10px solid transparent",
      height: "0",
      position: "absolute",
      width: 0,
      zIndex: 3,
    },
    "&:before": {
      borderLeft: "15px solid #00b977",
      borderRight: "10px solid transparent",
      left: 0,
    },
    "&:after": {
      borderLeft: "10px solid transparent",
      borderRight: "15px solid #00b977",
      right: 0,
    },

    "& .slot-column": {
      background: "#333",
      borderRadius: "0.10667rem",
      display: "inline-block",
      height: "100%",
      overflow: "hidden",
      position: "relative",
      textAlign: "center",
      verticalAlign: "bottom",
      width: "calc(20% - 0.10667rem)",
      "& .slot-transform": {
        transform: "translateY(-11.7rem)",
        "&.slot-scroll": {
          WebkitAnimation: "slotScroll 3s cubic-bezier(0.65, 0.02, 0.65, 1.06) infinite",
          animation: "slotScroll 3s cubic-bezier(0.65, 0.02, 0.65, 1.06) infinite",
          WebkitAnimationFillMode: "forwards",
          animationFillMode: "forwards",
        },

        "& .slot-num": {
          background: "#e1e1ec",
          borderRadius: "50%",
          color: "#0006",
          fontSize: "3rem",
          fontWeight: 700,
          height: "6rem",
          lineHeight: "60px",

          margin: "0 auto 5px",
          width: "6rem",
          "&.active": {
            background: "#00e065",
            color: "#fff",
          },
        },
      },
    },
  },
}));
const BoxQuay = ({
  TYPE_GAME,
  tinhTrang,
  ketQua,
  setIsDieuChinh,
  ketQuaDieuChinh,
  setKetQuaDieuChinh,
  isDieuChinh,
}) => {
  const rollDiceTimeIntervalRef = useRef(null);
  const [ketQuaDieuChinhTam, setKetQuaDieuChinhTam] = useState(ketQuaDieuChinh);
  const [ketQuaQuay, setKetQuaQuay] = useState([0, 0, 0]);
  const { socket } = useContext(SocketContext);
  const [chonTruocKetQua, setChonTruocKetQua] = useState({
    isTrigger: false,
    position: 0,
  });
  useEffect(() => {
    if (!chonTruocKetQua.isTrigger) {
      setKetQuaDieuChinhTam(ketQuaDieuChinh);
    }
  }, [ketQuaDieuChinh, chonTruocKetQua]);
  useEffect(() => {
    if (tinhTrang !== TINH_TRANG_GAME.DANG_CHO) {
      setChonTruocKetQua({ isTrigger: false });
    }
    if (tinhTrang === TINH_TRANG_GAME.DANG_QUAY) {
      rollDiceTimeIntervalRef.current = setInterval(() => {
        const randomFirstDice = getRandomArbitrary(1, 6);
        const randomSecondDice = getRandomArbitrary(1, 6);
        const randomThirdDice = getRandomArbitrary(1, 6);
        setKetQuaQuay([randomFirstDice, randomSecondDice, randomThirdDice]);
      }, 100);
    }

    return () => {
      clearInterval(rollDiceTimeIntervalRef.current);
    };
  }, [tinhTrang]);

  const handleClickOpenBangChonTruocKetQua = (position) => {
    if (tinhTrang !== TINH_TRANG_GAME.DANG_CHO) {
      return;
    }
    if (position < 0 || position > 2) {
      return;
    }
    setChonTruocKetQua({ isTrigger: true, position: position });
  };
  const handleClickChonTruocKetQua = (num) => {
    if (tinhTrang !== TINH_TRANG_GAME.DANG_CHO) {
      return;
    }
    const getPrevKetQua = [...ketQuaDieuChinhTam];
    getPrevKetQua[chonTruocKetQua.position] = num;
    setKetQuaDieuChinhTam(getPrevKetQua);

    // Chọn điều chỉnh cho ô kế tiếp
    let nextPosition = chonTruocKetQua.position + 1;
    if (chonTruocKetQua.position === 2) {
      nextPosition = 0;
    }
    handleClickOpenBangChonTruocKetQua(nextPosition);
  };
  const handleClickConfirmDieuChinhKetQua = (ketQuaDieuChinh) => {
    if (ketQuaDieuChinh.length < 3) {
      toast.error("Vui lòng chọn đầy đủ kết quả");
      return;
    }
    const checkValidDice = ketQuaDieuChinh.filter((item) => item < 1 || item > 6);

    if (checkValidDice.length > 0) {
      toast.error("Vui lòng chọn kết quả hợp lệ");
      return;
    }
    if (socket) {
      socket.emit(`${TYPE_GAME}:admin:set-ket-qua-dieu-chinh`, ketQuaDieuChinh);
      setKetQuaDieuChinh(ketQuaDieuChinh);
      toast.success("Điều chỉnh thành công");
      setChonTruocKetQua((prev) => ({ ...prev, isTrigger: false }));
    }
  };
  const handleClickResetDieuChinhKetQua = () => {
    if (socket) {
      socket.emit(`${TYPE_GAME}:admin:set-random-ket-qua-dieu-chinh`);
      toast.success("Điều chỉnh thành công");
      setChonTruocKetQua((prev) => ({ ...prev, isTrigger: false }));
      setKetQuaDieuChinh([0, 0, 0]);
    }
  };

  const convertKetQua = (index) => {
    if (tinhTrang === TINH_TRANG_GAME.DANG_QUAY) {
      return ketQuaQuay[index];
    }
    if (tinhTrang !== TINH_TRANG_GAME.DANG_CHO) {
      return ketQua[index];
    }
    return ketQuaDieuChinhTam[index];
  };

  return (
    <>
      {isDieuChinh && (
        <Box
          sx={{
            textAlign: "center",
          }}
        >
          <Typography>Kết quả điều chỉnh</Typography>
          <Box
            sx={{
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
            }}
            className="box-ketqua"
          >
            {ketQuaDieuChinhTam.map((item, i) => (
              <div className={`xucxac${item}`} key={i}></div>
            ))}
          </Box>
        </Box>
      )}

      <BoxContainer className="box-quay">
        <Box className="box">
          {Array.from({ length: 3 }).map((_, i) => (
            <Box
              className={`xucxac${convertKetQua(i)}`}
              sx={{
                cursor: tinhTrang === TINH_TRANG_GAME.DANG_CHO ? "pointer" : "default",
              }}
              key={i}
              onClick={() => handleClickOpenBangChonTruocKetQua(i)}
            />
          ))}
        </Box>
      </BoxContainer>
      {chonTruocKetQua.isTrigger && (
        <>
          <Typography
            sx={{
              fontWeight: "bold",
            }}
          >
            Bảng chọn trước kết quả cho bi {chonTruocKetQua.position + 1}:
          </Typography>
          <Box
            className="box-ketqua"
            sx={{
              display: "flex",
              gap: "10px",
              "&.box-ketqua [class^=xucxac]": {
                backgroundSize: "4rem",
                height: "4rem",
                width: "4rem",
              },
            }}
          >
            {Array.from({ length: 6 }).map((item, i) => (
              <Box
                key={i}
                sx={{
                  cursor: "pointer",
                }}
                onClick={() => handleClickChonTruocKetQua(i + 1)}
                className={`xucxac${i + 1}`}
              ></Box>
            ))}
          </Box>

          <Button
            onClick={() => handleClickConfirmDieuChinhKetQua(ketQuaDieuChinhTam)}
            sx={{
              marginTop: "10px",
            }}
          >
            Xác nhận
          </Button>
          <Button
            onClick={() => {
              setChonTruocKetQua((prev) => ({ ...prev, isTrigger: false }));
            }}
            sx={{
              marginTop: "10px",
            }}
          >
            Thoát
          </Button>
          <Button
            onClick={() => {
              handleClickResetDieuChinhKetQua();
              setIsDieuChinh(false);
            }}
            sx={{
              marginTop: "10px",
            }}
          >
            Bật random kết quả
          </Button>
        </>
      )}
    </>
  );
};
export default memo(BoxQuay);
