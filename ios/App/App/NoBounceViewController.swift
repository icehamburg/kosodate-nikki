import UIKit
import Capacitor

class NoBounceViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        // WebViewのスクロールバウンスを無効化
        webView?.scrollView.bounces = false
        webView?.scrollView.alwaysBounceVertical = false
        webView?.scrollView.alwaysBounceHorizontal = false

        // ダークモード対応: WebViewの背景色をシステム設定に合わせる
        webView?.isOpaque = false
        updateBackgroundColor()
    }

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            updateBackgroundColor()
        }
    }

    private func updateBackgroundColor() {
        let isDark = traitCollection.userInterfaceStyle == .dark
        let bgColor = isDark
            ? UIColor(red: 0x1A/255.0, green: 0x16/255.0, blue: 0x14/255.0, alpha: 1.0)
            : UIColor(red: 0xF7/255.0, green: 0xEB/255.0, blue: 0xDB/255.0, alpha: 1.0)
        view.backgroundColor = bgColor
        webView?.backgroundColor = bgColor
        webView?.scrollView.backgroundColor = bgColor
    }
}
