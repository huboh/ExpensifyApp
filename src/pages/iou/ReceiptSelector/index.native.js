import {ActivityIndicator, Alert, Linking, View, Text} from 'react-native';
import React, {useCallback, useRef, useState} from 'react';
import {Camera, useCameraDevices} from 'react-native-vision-camera';
import lodashGet from 'lodash/get';
import PropTypes from 'prop-types';
import {launchImageLibrary} from 'react-native-image-picker';
import {withOnyx} from 'react-native-onyx';
import PressableWithFeedback from '../../../components/Pressable/PressableWithFeedback';
import Icon from '../../../components/Icon';
import * as Expensicons from '../../../components/Icon/Expensicons';
import styles from '../../../styles/styles';
import Shutter from '../../../../assets/images/shutter.svg';
import Hand from '../../../../assets/images/hand.svg';
import * as IOU from '../../../libs/actions/IOU';
import themeColors from '../../../styles/themes/default';
import reportPropTypes from '../../reportPropTypes';
import CONST from '../../../CONST';
import Button from '../../../components/Button';
import useLocalize from '../../../hooks/useLocalize';
import ONYXKEYS from '../../../ONYXKEYS';
import Log from '../../../libs/Log';

const propTypes = {
    /** Route params */
    route: PropTypes.shape({
        params: PropTypes.shape({
            iouType: PropTypes.string,
            reportID: PropTypes.string,
        }),
    }),

    /** The report on which the request is initiated on */
    report: reportPropTypes,

    /** Holds data related to Money Request view state, rather than the underlying Money Request data. */
    iou: PropTypes.shape({
        id: PropTypes.string,
        amount: PropTypes.number,
        currency: PropTypes.string,
        participants: PropTypes.arrayOf(
            PropTypes.shape({
                accountID: PropTypes.number,
                login: PropTypes.string,
                isPolicyExpenseChat: PropTypes.bool,
                isOwnPolicyExpenseChat: PropTypes.bool,
                selected: PropTypes.bool,
            }),
        ),
    }),
};

const defaultProps = {
    route: {
        params: {
            iouType: '',
            reportID: '',
        },
    },
    report: {},
    iou: {
        id: '',
        amount: 0,
        currency: CONST.CURRENCY.USD,
        participants: [],
    },
};

/**
 * See https://github.com/react-native-image-picker/react-native-image-picker/#options
 * for ImagePicker configuration options
 */
const imagePickerOptions = {
    includeBase64: false,
    saveToPhotos: false,
    selectionLimit: 1,
    includeExtra: false,
};

/**
 * Return imagePickerOptions based on the type
 * @param {String} type
 * @returns {Object}
 */
function getImagePickerOptions(type) {
    // mediaType property is one of the ImagePicker configuration to restrict types'
    const mediaType = type === CONST.ATTACHMENT_PICKER_TYPE.IMAGE ? 'photo' : 'mixed';
    return {
        mediaType,
        ...imagePickerOptions,
    };
}

function ReceiptSelector(props) {
    const devices = useCameraDevices('wide-angle-camera');
    const device = devices.back;

    const camera = useRef(null);
    const [flash, setFlash] = useState(false);

    const [permissions, setPermissions] = useState('authorized');

    const iouType = lodashGet(props.route, 'params.iouType', '');
    const reportID = lodashGet(props.route, 'params.reportID', '');

    const {translate} = useLocalize();
    /**
     * Inform the users when they need to grant camera access and guide them to settings
     */
    const showPermissionsAlert = () => {
        Alert.alert(
            translate('attachmentPicker.cameraPermissionRequired'),
            translate('attachmentPicker.expensifyDoesntHaveAccessToCamera'),
            [
                {
                    text: translate('common.cancel'),
                    style: 'cancel',
                },
                {
                    text: translate('common.settings'),
                    onPress: () => Linking.openSettings(),
                },
            ],
            {cancelable: false},
        );
    };

    /**
     * A generic handling when we don't know the exact reason for an error
     *
     */
    const showGeneralAlert = () => {
        Alert.alert(translate('attachmentPicker.attachmentError'), translate('attachmentPicker.errorWhileSelectingAttachment'));
    };

    const askForPermissions = () => {
        if (permissions === 'not-determined') {
            Camera.requestCameraPermission().then((permissionStatus) => {
                setPermissions(permissionStatus);
            });
        } else {
            Linking.openSettings();
        }
    };

    /**
     * Common image picker handling
     *
     * @param {function} imagePickerFunc - RNImagePicker.launchCamera or RNImagePicker.launchImageLibrary
     * @returns {Promise}
     */
    const showImagePicker = (imagePickerFunc) =>
        new Promise((resolve, reject) => {
            imagePickerFunc(getImagePickerOptions(CONST.ATTACHMENT_PICKER_TYPE.IMAGE), (response) => {
                if (response.didCancel) {
                    // When the user cancelled resolve with no attachment
                    return resolve();
                }
                if (response.errorCode) {
                    switch (response.errorCode) {
                        case 'permission':
                            showPermissionsAlert();
                            return resolve();
                        default:
                            showGeneralAlert();
                            break;
                    }

                    return reject(new Error(`Error during attachment selection: ${response.errorMessage}`));
                }

                return resolve(response.assets);
            });
        });

    const takePhoto = useCallback(() => {
        const showCameraAlert = () => {
            Alert.alert(translate('receipt.cameraErrorTitle'), translate('receipt.cameraErrorMessage'));
        };

        if (!camera.current) {
            showCameraAlert();
            return;
        }

        camera.current
            .takePhoto({
                qualityPrioritization: 'speed',
                flash: flash ? 'on' : 'off',
            })
            .then((photo) => {
                IOU.setMoneyRequestReceipt(`file://${photo.path}`, photo.path);
                IOU.navigateToNextPage(props.iou, iouType, reportID, props.report);
            })
            .catch(() => {
                showCameraAlert();
            });
    }, [flash, iouType, props.iou, props.report, reportID, translate]);

    Camera.getCameraPermissionStatus().then((permissionStatus) => {
        setPermissions(permissionStatus);
    });

    const getCameraView = () => {
        if (permissions !== CONST.RECEIPT.PERMISSION_AUTHORIZED) {
            return (
                <View style={[styles.cameraView, styles.permissionView]}>
                    <Hand
                        width={CONST.RECEIPT.HAND_ICON_WIDTH}
                        height={CONST.RECEIPT.HAND_ICON_HEIGHT}
                        style={[styles.pb5]}
                    />
                    <Text style={[styles.textReceiptUpload]}>{translate('receipt.takePhoto')}</Text>
                    <Text style={[styles.subTextReceiptUpload]}>{translate('receipt.cameraAccess')}</Text>
                    <PressableWithFeedback
                        accessibilityLabel={translate('receipt.givePermission')}
                        accessibilityRole={CONST.ACCESSIBILITY_ROLE.BUTTON}
                    >
                        <Button
                            medium
                            success
                            text={translate('receipt.givePermission')}
                            style={[styles.p9, styles.pt5]}
                            onPress={askForPermissions}
                        />
                    </PressableWithFeedback>
                </View>
            );
        }

        return device == null ? (
            <View style={[styles.cameraView]}>
                <ActivityIndicator
                    size="large"
                    style={[styles.flex1]}
                    color={themeColors.textSupporting}
                />
            </View>
        ) : (
            <Camera
                ref={camera}
                device={device}
                style={[styles.cameraView]}
                isActive
                photo
            />
        );
    };

    return (
        <View style={styles.flex1}>
            {getCameraView()}
            <View style={[styles.flexRow, styles.justifyContentAround, styles.alignItemsCenter, styles.pv3]}>
                <PressableWithFeedback
                    accessibilityRole="button"
                    accessibilityLabel={translate('receipt.gallery')}
                    style={[styles.alignItemsStart]}
                    onPress={() => {
                        showImagePicker(launchImageLibrary)
                            .then((receiptImage) => {
                                IOU.setMoneyRequestReceipt(receiptImage[0].uri, receiptImage[0].fileName);
                                IOU.navigateToNextPage(props.iou, iouType, reportID, props.report);
                            })
                            .catch(() => {
                                Log.info('User did not select an image from gallery');
                            });
                    }}
                >
                    <Icon
                        height={32}
                        width={32}
                        src={Expensicons.Gallery}
                        fill={themeColors.textSupporting}
                    />
                </PressableWithFeedback>
                <PressableWithFeedback
                    accessibilityRole="button"
                    accessibilityLabel={translate('receipt.shutter')}
                    style={[styles.alignItemsCenter]}
                    onPress={takePhoto}
                >
                    <Shutter
                        width={CONST.RECEIPT.SHUTTER_SIZE}
                        height={CONST.RECEIPT.SHUTTER_SIZE}
                    />
                </PressableWithFeedback>
                <PressableWithFeedback
                    accessibilityRole={CONST.ACCESSIBILITY_ROLE.BUTTON}
                    accessibilityLabel={translate('receipt.flash')}
                    style={[styles.alignItemsEnd]}
                    onPress={() => setFlash((prevFlash) => !prevFlash)}
                >
                    <Icon
                        height={32}
                        width={32}
                        src={Expensicons.Bolt}
                        fill={flash ? themeColors.iconHovered : themeColors.textSupporting}
                    />
                </PressableWithFeedback>
            </View>
        </View>
    );
}

ReceiptSelector.defaultProps = defaultProps;
ReceiptSelector.propTypes = propTypes;
ReceiptSelector.displayName = 'ReceiptSelector';

export default withOnyx({
    iou: {
        key: ONYXKEYS.IOU,
    },
    report: {
        key: ({route}) => `${ONYXKEYS.COLLECTION.REPORT}${lodashGet(route, 'params.reportID', '')}`,
    },
})(ReceiptSelector);
