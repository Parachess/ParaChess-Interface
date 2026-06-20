/**
* Available move action flags.
*/
const Actions = {
    MOVE: 1,
    CAPTURE: 2,
    PROMOTION: 4,
    K_CASTLE: 8,
    Q_CASTLE: 16,
    EP_CAPTURE: 32
};

export default Actions;