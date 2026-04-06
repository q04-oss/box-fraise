import UIKit

/// First-time variety stamp: a round stamp-style overlay that scales in, holds, then fades out.
/// Add as a UIKit subview over the ARSCNView; call `animateAndRemove()` to trigger.
class ARPassportStampView: UIView {

  private let varietyName: String
  private let accent = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1)

  init(varietyName: String) {
    self.varietyName = varietyName
    super.init(frame: CGRect(x: 0, y: 0, width: 220, height: 220))
    backgroundColor = .clear
    alpha = 0
    buildContent()
  }

  required init?(coder: NSCoder) { fatalError() }

  private func buildContent() {
    // Stamp circle border
    let circle = UIView(frame: bounds.insetBy(dx: 10, dy: 10))
    circle.layer.borderColor = accent.withAlphaComponent(0.9).cgColor
    circle.layer.borderWidth = 4
    circle.layer.cornerRadius = circle.bounds.width / 2
    circle.backgroundColor = UIColor.black.withAlphaComponent(0.70)
    circle.translatesAutoresizingMaskIntoConstraints = false
    addSubview(circle)

    let stack = UIStackView()
    stack.axis = .vertical
    stack.alignment = .center
    stack.spacing = 4
    stack.translatesAutoresizingMaskIntoConstraints = false
    circle.addSubview(stack)

    let firstLabel = UILabel()
    firstLabel.text = "FIRST TIME"
    firstLabel.font = UIFont.monospacedSystemFont(ofSize: 9, weight: .bold)
    firstLabel.textColor = accent
    firstLabel.letterSpacing(2)
    stack.addArrangedSubview(firstLabel)

    let nameLabel = UILabel()
    nameLabel.text = varietyName.uppercased()
    nameLabel.font = UIFont.systemFont(ofSize: 17, weight: .bold)
    nameLabel.textColor = .white
    nameLabel.textAlignment = .center
    nameLabel.numberOfLines = 2
    stack.addArrangedSubview(nameLabel)

    let checkLabel = UILabel()
    checkLabel.text = "✓"
    checkLabel.font = UIFont.systemFont(ofSize: 28, weight: .medium)
    checkLabel.textColor = accent
    stack.addArrangedSubview(checkLabel)

    let yearLabel = UILabel()
    let year = Calendar.current.component(.year, from: Date())
    yearLabel.text = String(year)
    yearLabel.font = UIFont.monospacedSystemFont(ofSize: 9, weight: .regular)
    yearLabel.textColor = UIColor.white.withAlphaComponent(0.5)
    stack.addArrangedSubview(yearLabel)

    NSLayoutConstraint.activate([
      circle.topAnchor.constraint(equalTo: topAnchor, constant: 10),
      circle.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 10),
      circle.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -10),
      circle.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -10),
      stack.centerXAnchor.constraint(equalTo: circle.centerXAnchor),
      stack.centerYAnchor.constraint(equalTo: circle.centerYAnchor),
      stack.widthAnchor.constraint(lessThanOrEqualTo: circle.widthAnchor, constant: -24),
    ])
  }

  /// Animate in with overshoot scale, hold 2.5s, then fade out and remove from superview.
  func animateAndRemove() {
    transform = CGAffineTransform(scaleX: 0.3, y: 0.3).rotated(by: -0.3)
    UIView.animate(withDuration: 0.45, delay: 0, usingSpringWithDamping: 0.55, initialSpringVelocity: 0.8, options: [], animations: {
      self.alpha = 1
      self.transform = CGAffineTransform(rotationAngle: 0.04)
    }) { _ in
      UIView.animate(withDuration: 0.35, delay: 2.5, options: [], animations: {
        self.alpha = 0
        self.transform = CGAffineTransform(scaleX: 1.1, y: 1.1)
      }) { _ in
        self.removeFromSuperview()
      }
    }
  }
}

private extension UILabel {
  func letterSpacing(_ spacing: CGFloat) {
    if let text = self.text {
      let attrs = NSMutableAttributedString(string: text)
      attrs.addAttribute(.kern, value: spacing, range: NSRange(location: 0, length: attrs.length))
      attributedText = attrs
    }
  }
}
