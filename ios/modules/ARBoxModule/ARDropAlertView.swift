import UIKit

/// Screen-space banner at the top of the AR view alerting the user to an active variety drop.
/// Tapping the banner calls the `onTap` closure (typically deep-links to DropsPanel).
class ARDropAlertView: UIView {

  private let dropTitle: String
  private let priceCents: Int
  private let onTap: () -> Void

  private let accent = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1)

  init(dropTitle: String, priceCents: Int, onTap: @escaping () -> Void) {
    self.dropTitle = dropTitle
    self.priceCents = priceCents
    self.onTap = onTap
    super.init(frame: .zero)
    backgroundColor = accent
    layer.cornerRadius = 12
    layer.shadowColor = UIColor.black.cgColor
    layer.shadowOpacity = 0.25
    layer.shadowRadius = 8
    layer.shadowOffset = CGSize(width: 0, height: 3)
    buildContent()
    let tap = UITapGestureRecognizer(target: self, action: #selector(tapped))
    addGestureRecognizer(tap)
  }

  required init?(coder: NSCoder) { fatalError() }

  private func buildContent() {
    let stack = UIStackView()
    stack.axis = .horizontal
    stack.alignment = .center
    stack.spacing = 10
    stack.layoutMargins = UIEdgeInsets(top: 10, left: 14, bottom: 10, right: 14)
    stack.isLayoutMarginsRelativeArrangement = true
    stack.translatesAutoresizingMaskIntoConstraints = false
    addSubview(stack)

    let icon = UILabel()
    icon.text = "⚡"
    icon.font = UIFont.systemFont(ofSize: 16)
    stack.addArrangedSubview(icon)

    let textStack = UIStackView()
    textStack.axis = .vertical
    textStack.spacing = 1

    let titleLabel = UILabel()
    titleLabel.text = "DROP AVAILABLE"
    titleLabel.font = UIFont.monospacedSystemFont(ofSize: 8, weight: .bold)
    titleLabel.textColor = UIColor.white.withAlphaComponent(0.75)
    textStack.addArrangedSubview(titleLabel)

    let nameLabel = UILabel()
    nameLabel.text = "\(dropTitle)  ·  CA$\(String(format: "%.2f", Double(priceCents) / 100))"
    nameLabel.font = UIFont.systemFont(ofSize: 13, weight: .semibold)
    nameLabel.textColor = .white
    textStack.addArrangedSubview(nameLabel)

    stack.addArrangedSubview(textStack)

    // Arrow
    let arrow = UILabel()
    arrow.text = "→"
    arrow.font = UIFont.systemFont(ofSize: 16, weight: .medium)
    arrow.textColor = UIColor.white.withAlphaComponent(0.8)
    stack.addArrangedSubview(arrow)

    NSLayoutConstraint.activate([
      stack.topAnchor.constraint(equalTo: topAnchor),
      stack.leadingAnchor.constraint(equalTo: leadingAnchor),
      stack.trailingAnchor.constraint(equalTo: trailingAnchor),
      stack.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  @objc private func tapped() {
    UIView.animate(withDuration: 0.12, animations: { self.alpha = 0.7 }) { _ in
      UIView.animate(withDuration: 0.1) { self.alpha = 1 }
    }
    onTap()
  }

  /// Animate in from top.
  func animateIn() {
    alpha = 0
    transform = CGAffineTransform(translationX: 0, y: -20)
    UIView.animate(withDuration: 0.4, delay: 0.6, usingSpringWithDamping: 0.75, initialSpringVelocity: 0.5, options: [], animations: {
      self.alpha = 1
      self.transform = .identity
    })
  }
}
