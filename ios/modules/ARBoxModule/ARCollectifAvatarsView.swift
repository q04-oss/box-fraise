import UIKit

/// Screen-space overlay: circular arrangement of collectif member initials with a count badge.
/// Add as a UIKit subview over the ARSCNView, pinned to bottom-right.
class ARCollectifAvatarsView: UIView {

  private let names: [String]
  private let accent = UIColor(red: 0.788, green: 0.592, blue: 0.227, alpha: 1)
  private let bgDark = UIColor(red: 0.08, green: 0.07, blue: 0.06, alpha: 0.82)
  private let avatarSize: CGFloat = 36
  private let maxVisible = 4

  init(names: [String]) {
    self.names = names
    super.init(frame: .zero)
    backgroundColor = .clear
    isUserInteractionEnabled = false
    buildAvatars()
  }

  required init?(coder: NSCoder) { fatalError() }

  private func buildAvatars() {
    guard !names.isEmpty else { return }

    // Container pill
    let container = UIView()
    container.backgroundColor = UIColor.black.withAlphaComponent(0.50)
    container.layer.cornerRadius = 22
    container.translatesAutoresizingMaskIntoConstraints = false
    addSubview(container)

    let stack = UIStackView()
    stack.axis = .horizontal
    stack.spacing = -8
    stack.translatesAutoresizingMaskIntoConstraints = false
    container.addSubview(stack)

    let visible = Array(names.prefix(maxVisible))
    for name in visible {
      let initial = String(name.prefix(1)).uppercased()
      let bubble = makeInitialBubble(initial: initial)
      stack.addArrangedSubview(bubble)
    }

    // Overflow count
    let extra = names.count - visible.count
    if extra > 0 {
      let overflowBubble = makeInitialBubble(initial: "+\(extra)")
      stack.addArrangedSubview(overflowBubble)
    }

    // "TODAY" label
    let label = UILabel()
    label.text = "COLLECTIF TODAY"
    label.font = UIFont.monospacedSystemFont(ofSize: 8, weight: .medium)
    label.textColor = UIColor.white.withAlphaComponent(0.6)
    label.translatesAutoresizingMaskIntoConstraints = false
    container.addSubview(label)

    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 10),
      stack.centerYAnchor.constraint(equalTo: container.centerYAnchor, constant: -8),
      label.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 12),
      label.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -6),
      container.topAnchor.constraint(equalTo: topAnchor),
      container.leadingAnchor.constraint(equalTo: leadingAnchor),
      container.trailingAnchor.constraint(equalTo: stack.trailingAnchor, constant: 10),
      container.heightAnchor.constraint(equalToConstant: 60),
    ])
    NSLayoutConstraint.activate([
      trailingAnchor.constraint(equalTo: container.trailingAnchor),
      bottomAnchor.constraint(equalTo: container.bottomAnchor),
    ])
  }

  private func makeInitialBubble(initial: String) -> UIView {
    let view = UIView()
    view.backgroundColor = accent.withAlphaComponent(0.85)
    view.layer.cornerRadius = avatarSize / 2
    view.layer.borderWidth = 1.5
    view.layer.borderColor = UIColor.white.withAlphaComponent(0.4).cgColor
    view.translatesAutoresizingMaskIntoConstraints = false
    view.widthAnchor.constraint(equalToConstant: avatarSize).isActive = true
    view.heightAnchor.constraint(equalToConstant: avatarSize).isActive = true

    let label = UILabel()
    label.text = initial
    label.font = UIFont.monospacedSystemFont(ofSize: 13, weight: .semibold)
    label.textColor = .white
    label.textAlignment = .center
    label.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(label)
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: view.centerYAnchor),
    ])
    return view
  }
}
